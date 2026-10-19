import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {TextEncoder,TextDecoder} from 'util';
Object.assign(global,{TextEncoder,TextDecoder});
const {MemoryRouter}=require('react-router-dom');
const {VendorDashboard,VendorMenu,VendorReports,VendorProfile}=require('./VendorPages');
const API=require('../services/api').default;
jest.mock('../services/api',()=>({__esModule:true,default:{get:jest.fn(),post:jest.fn(),put:jest.fn(),patch:jest.fn(),delete:jest.fn()}}));
jest.mock('../context/AuthContext',()=>({useAuth:()=>({user:{_id:'vendor1',name:'Campus Kitchen',role:'vendor'},socket:{current:null},logout:jest.fn()})}));
const response=data=>({data:{data}});
const order={_id:'order123456',studentId:{name:'Oliver'},paymentStatus:'PAID',status:'Confirmed',createdAt:new Date().toISOString(),totalAmount:450,pickupTime:'12:00',items:[{nameSnapshot:'Rice and curry',quantity:1,priceSnapshot:450,lineTotal:450}]};
const mount=component=>render(<MemoryRouter>{component}</MemoryRouter>);
beforeEach(()=>{jest.clearAllMocks();API.get.mockResolvedValue(response({orders:[],items:[]}));});
test('vendor order progression never exposes direct completion for ready orders',async()=>{
 API.get.mockResolvedValue(response({orders:[order,{...order,_id:'ready123456',status:'Ready for Pickup'}]}));API.patch.mockResolvedValue(response({}));mount(<VendorDashboard/>);
 fireEvent.click(await screen.findByRole('button',{name:'Start preparing'}));await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/orders/order123456/status',{status:'Preparing'}));
 expect(screen.getByRole('link',{name:'Verify collection'})).toHaveAttribute('href','/vendor/operations');expect(within(screen.getByRole('link',{name:'Verify collection'}).closest('article')).queryByRole('button')).not.toBeInTheDocument();
});
test('new vendor meal submits stock and price as numbers',async()=>{
 API.post.mockResolvedValue(response({}));mount(<VendorMenu/>);fireEvent.click(screen.getByRole('button',{name:'Add a meal'}));
 fireEvent.change(screen.getByLabelText('Meal name'),{target:{value:'Rice and curry'}});fireEvent.change(screen.getByLabelText('Description'),{target:{value:'Freshly cooked rice and chicken curry'}});fireEvent.change(screen.getByLabelText('Price (LKR)'),{target:{value:'450'}});fireEvent.change(screen.getByLabelText('Daily portions'),{target:{value:'25'}});
 fireEvent.click(screen.getByRole('button',{name:'Save meal'}));await waitFor(()=>expect(API.post).toHaveBeenCalledWith('/menu',expect.objectContaining({name:'Rice and curry',price:450,dailyStock:25,category:'Rice',imageUrl:null})));expect(await screen.findByText('Meal added to your menu.')).toBeInTheDocument();
});
test('reports exclude old completed sales from the selected period',async()=>{
 API.get.mockResolvedValue(response({orders:[{...order,status:'Completed',items:[{nameSnapshot:'Fresh meal',quantity:1,priceSnapshot:450}]},{...order,_id:'old',status:'Completed',createdAt:'2020-01-01T00:00:00Z',items:[{nameSnapshot:'Old meal',quantity:1,priceSnapshot:450}]}]}));mount(<VendorReports/>);
 expect(await screen.findByText('Fresh meal')).toBeInTheDocument();expect(screen.queryByText('Old meal')).not.toBeInTheDocument();fireEvent.change(screen.getByLabelText('Reporting period'),{target:{value:'all'}});expect(screen.getByText('Old meal')).toBeInTheDocument();
});
test('profile saves bank and shop details without overwriting opening hours',async()=>{
 API.get.mockResolvedValue(response({user:{email:'vendor@example.test',vendorProfile:{businessName:'Kitchen',description:'Fresh meals',openingTime:'07:00',paymentDetails:{bankName:'Test Bank',accountNumber:'123'}}}}));API.patch.mockResolvedValue(response({}));mount(<VendorProfile/>);
 const name=await screen.findByLabelText('Business name');fireEvent.change(name,{target:{value:'Campus Kitchen'}});fireEvent.click(screen.getByRole('button',{name:'Save shop profile'}));await waitFor(()=>expect(API.patch).toHaveBeenCalledWith('/vendor/profile',expect.objectContaining({businessName:'Campus Kitchen',bankName:'Test Bank',accountNumber:'123'})));expect(API.patch.mock.calls[0][1]).not.toHaveProperty('openingTime');
});
