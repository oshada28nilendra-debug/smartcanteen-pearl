const { localDate, vendorAvailability, itemAvailability } = require('../services/availability');
const vendor = (overrides = {}) => ({
  accountStatus: 'active', vendorStatus: 'approved',
  vendorProfile: { openingTime: '08:00', closingTime: '18:00', openDays: [2], ...overrides },
});
test('Colombo date changes at 18:30 UTC', () => {
  expect(localDate(new Date('2026-10-13T18:29:59Z'))).toBe('2026-10-13');
  expect(localDate(new Date('2026-10-13T18:30:00Z'))).toBe('2026-10-14');
});
test('opening is inclusive and closing is exclusive in Colombo time', () => {
  expect(vendorAvailability(vendor(), new Date('2026-10-13T02:29:59Z')).isOpen).toBe(false);
  expect(vendorAvailability(vendor(), new Date('2026-10-13T02:30:00Z')).isOpen).toBe(true);
  expect(vendorAvailability(vendor(), new Date('2026-10-13T12:29:59Z')).isOpen).toBe(true);
  expect(vendorAvailability(vendor(), new Date('2026-10-13T12:30:00Z')).isOpen).toBe(false);
});
test('open days use the Colombo weekday across the UTC date boundary', () => {
  const shop = vendor({ openingTime: '00:00', closingTime: '23:59', openDays: [3] });
  expect(vendorAvailability(shop, new Date('2026-10-13T18:29:00Z')).isOpen).toBe(false);
  expect(vendorAvailability(shop, new Date('2026-10-13T18:30:00Z')).isOpen).toBe(true);
});
test('pause and inactive accounts prevent ordering; legacy approval status does not', () => {
  const now = new Date('2026-10-13T03:00:00Z');
  expect(vendorAvailability(vendor({ordersPaused:true}), now)).toEqual({isOpen:false,orderingReason:'Ordering paused'});
  expect(vendorAvailability({...vendor(),vendorStatus:'pending'}, now).isOpen).toBe(true);
  expect(vendorAvailability({...vendor(),accountStatus:'inactive'}, now).isOpen).toBe(false);
});
test('daily stock preview resets at the Colombo date boundary', () => {
  const item={dailyStock:10,stockDate:'2026-10-13',stockRemaining:0,isAvailable:true};
  const shop=vendor({openingTime:'00:00',closingTime:'23:59',openDays:[0,1,2,3,4,5,6]});
  expect(itemAvailability(item,shop,new Date('2026-10-13T18:28:00Z')).effectiveAvailable).toBe(false);
  expect(itemAvailability(item,shop,new Date('2026-10-13T18:30:00Z'))).toMatchObject({stockRemaining:10,stockDate:'2026-10-14',effectiveAvailable:true});
});
