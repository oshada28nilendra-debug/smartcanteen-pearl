import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import {TextEncoder,TextDecoder} from 'util';
Object.assign(global,{TextEncoder,TextDecoder});
const {MemoryRouter}=require('react-router-dom');
const {AuthPage,Landing}=require('./PublicPages');
const mockLogin=jest.fn(),mockRegister=jest.fn();
jest.mock('../context/AuthContext',()=>({useAuth:()=>({login:mockLogin,register:mockRegister})}));
beforeEach(()=>{jest.clearAllMocks();mockRegister.mockResolvedValue({});});
function mount(ui,entry='/'){render(<MemoryRouter initialEntries={[entry]}>{ui}</MemoryRouter>);}
test('vendor signup sends shop details and shows immediate next step',async()=>{mount(<AuthPage signup/>,'/register?role=vendor');fireEvent.change(screen.getByLabelText('Full name'),{target:{value:'Food Owner'}});fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'owner@test.com'}});fireEvent.change(screen.getByLabelText('Shop name'),{target:{value:'Campus Kitchen'}});fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Password@123'}});fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'Password@123'}});fireEvent.click(screen.getByRole('button',{name:'Create account'}));await waitFor(()=>expect(mockRegister).toHaveBeenCalledWith(expect.objectContaining({role:'vendor',businessName:'Campus Kitchen'})));expect(await screen.findByText('Your shop is ready!')).toBeInTheDocument();});
test('mismatched passwords never submit',()=>{mount(<AuthPage signup/>);fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Password@123'}});fireEvent.change(screen.getByLabelText('Confirm password'),{target:{value:'Different@123'}});fireEvent.submit(screen.getByRole('button',{name:'Create account'}).closest('form'));expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');expect(mockRegister).not.toHaveBeenCalled();});
test('login displays API errors and allows retry',async()=>{mockLogin.mockRejectedValue({response:{data:{message:'Invalid email or password.'}}});mount(<AuthPage/>);fireEvent.change(screen.getByLabelText('Email address'),{target:{value:'owner@test.com'}});fireEvent.change(screen.getByLabelText('Password'),{target:{value:'wrong'}});fireEvent.submit(screen.getByRole('button',{name:'Sign in'}).closest('form'));expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');expect(screen.getByRole('button',{name:'Sign in'})).not.toBeDisabled();});
test('landing connects shop onboarding to vendor registration',()=>{mount(<Landing/>);expect(screen.getByRole('link',{name:/Create a shop/})).toHaveAttribute('href','/register?role=vendor');});
