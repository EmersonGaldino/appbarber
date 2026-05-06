import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { HomeScreen } from '../screens/Home/HomeScreen';

import { ServicesListScreen } from '../screens/Services/ServicesListScreen';
import { ServiceFormScreen } from '../screens/Services/ServiceFormScreen';

import { ProfessionalsListScreen } from '../screens/Professionals/ProfessionalsListScreen';
import { ProfessionalFormScreen } from '../screens/Professionals/ProfessionalFormScreen';

import { ProductsListScreen } from '../screens/Products/ProductsListScreen';
import { ProductFormScreen } from '../screens/Products/ProductFormScreen';

import { ScheduleMainScreen } from '../screens/Schedule/ScheduleMainScreen';
import { AppointmentFormScreen } from '../screens/Schedule/AppointmentFormScreen';
import { AppointmentDetailScreen } from '../screens/Schedule/AppointmentDetailScreen';

import { FinancialMainScreen } from '../screens/Financial/FinancialMainScreen';
import { TransactionFormScreen } from '../screens/Financial/TransactionFormScreen';

import { CampaignsListScreen } from '../screens/Campaigns/CampaignsListScreen';
import { CampaignFormScreen } from '../screens/Campaigns/CampaignFormScreen';

import { AccountScreen } from '../screens/Account/AccountScreen';

import {
  ServicesStackParamList,
  ProfessionalsStackParamList,
  ProductsStackParamList,
  ScheduleStackParamList,
  FinancialStackParamList,
  CampaignsStackParamList,
} from '../types';
import { CustomTabBar, HEADER_STYLE, TabIconConfig } from './CustomTabBar';

const Tab = createBottomTabNavigator();
const ServicesStack = createStackNavigator<ServicesStackParamList>();
const ProfessionalsStack = createStackNavigator<ProfessionalsStackParamList>();
const ProductsStack = createStackNavigator<ProductsStackParamList>();
const ScheduleStack = createStackNavigator<ScheduleStackParamList>();
const FinancialStack = createStackNavigator<FinancialStackParamList>();
const CampaignsStack = createStackNavigator<CampaignsStackParamList>();

function ServicesNavigator() {
  return (
    <ServicesStack.Navigator screenOptions={HEADER_STYLE}>
      <ServicesStack.Screen name="ServicesList" component={ServicesListScreen} options={{ title: 'Serviços' }} />
      <ServicesStack.Screen name="ServiceForm" component={ServiceFormScreen} />
    </ServicesStack.Navigator>
  );
}

function ProfessionalsNavigator() {
  return (
    <ProfessionalsStack.Navigator screenOptions={HEADER_STYLE}>
      <ProfessionalsStack.Screen name="ProfessionalsList" component={ProfessionalsListScreen} options={{ title: 'Equipe' }} />
      <ProfessionalsStack.Screen name="ProfessionalForm" component={ProfessionalFormScreen} />
    </ProfessionalsStack.Navigator>
  );
}

function ProductsNavigator() {
  return (
    <ProductsStack.Navigator screenOptions={HEADER_STYLE}>
      <ProductsStack.Screen name="ProductsList" component={ProductsListScreen} options={{ title: 'Produtos' }} />
      <ProductsStack.Screen name="ProductForm" component={ProductFormScreen} />
    </ProductsStack.Navigator>
  );
}

function ScheduleNavigator() {
  return (
    <ScheduleStack.Navigator screenOptions={HEADER_STYLE}>
      <ScheduleStack.Screen name="ScheduleMain" component={ScheduleMainScreen} options={{ title: 'Agenda' }} />
      <ScheduleStack.Screen name="AppointmentForm" component={AppointmentFormScreen} />
      <ScheduleStack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: 'Atendimento' }} />
    </ScheduleStack.Navigator>
  );
}

function FinancialNavigator() {
  return (
    <FinancialStack.Navigator screenOptions={HEADER_STYLE}>
      <FinancialStack.Screen name="FinancialMain" component={FinancialMainScreen} options={{ title: 'Financeiro' }} />
      <FinancialStack.Screen name="TransactionForm" component={TransactionFormScreen} />
    </FinancialStack.Navigator>
  );
}

function CampaignsNavigator() {
  return (
    <CampaignsStack.Navigator screenOptions={HEADER_STYLE}>
      <CampaignsStack.Screen name="CampaignsList" component={CampaignsListScreen} options={{ title: 'Campanhas' }} />
      <CampaignsStack.Screen name="CampaignForm" component={CampaignFormScreen} />
    </CampaignsStack.Navigator>
  );
}

const TAB_ICONS: Record<string, TabIconConfig> = {
  Home: { icon: 'view-dashboard', label: 'Início' },
  Schedule: { icon: 'calendar-month', label: 'Agenda' },
  Services: { icon: 'scissors-cutting', label: 'Serviços' },
  Professionals: { icon: 'account-tie', label: 'Equipe' },
  Products: { icon: 'shopping', label: 'Produtos' },
  Financial: { icon: 'finance', label: 'Caixa' },
  Campaigns: { icon: 'bullhorn', label: 'Avisos' },
  Account: { icon: 'account-circle', label: 'Conta' },
};

export function AdminNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} iconsByName={TAB_ICONS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Schedule" component={ScheduleNavigator} />
      <Tab.Screen name="Services" component={ServicesNavigator} />
      <Tab.Screen name="Professionals" component={ProfessionalsNavigator} />
      <Tab.Screen name="Products" component={ProductsNavigator} />
      <Tab.Screen name="Financial" component={FinancialNavigator} />
      <Tab.Screen name="Campaigns" component={CampaignsNavigator} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
