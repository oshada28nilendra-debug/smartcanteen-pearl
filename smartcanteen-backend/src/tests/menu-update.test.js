const mongoose = require('mongoose');
const {MenuItem} = require('../models/MenuItem');
const {updateMenuItem} = require('../controllers/menu.controller');
const response = () => ({status(){return this;},json(body){this.body=body;return this;}});
let item;
beforeEach(() => {
 item=new MenuItem({vendorId:new mongoose.Types.ObjectId(),name:'Meal',description:'Fresh meal',price:100,category:'Rice',dailyStock:2});
 jest.spyOn(MenuItem,'findOne').mockResolvedValue(item);
 jest.spyOn(MenuItem,'findOneAndUpdate').mockImplementation(async(filter,update)=>({name:update[0].$set.name.$literal,price:update[0].$set.price.$literal}));
});
afterEach(()=>jest.restoreAllMocks());
test('stock edits cast price and preserve dollar-prefixed text as a literal',async()=>{
 const res=response();let error;
 await updateMenuItem({params:{itemId:item._id},user:{_id:item.vendorId,email:'vendor@test.com'},body:{name:' $special ',price:'123.456',dailyStock:5}},res,e=>{error=e;});
 expect(error).toBeUndefined();expect(res.body.data.item).toMatchObject({name:'$special',price:123.46});
});
test('stock edits reject invalid schema fields before writing the aggregation update',async()=>{
 let error;
 await updateMenuItem({params:{itemId:item._id},user:{_id:item.vendorId},body:{price:-1,dailyStock:5}},response(),e=>{error=e;});
 expect(error.name).toBe('ValidationError');expect(MenuItem.findOneAndUpdate).not.toHaveBeenCalled();
});
