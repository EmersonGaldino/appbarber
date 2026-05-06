import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { ClientHomeScreen } from '../screens/Client/ClientHomeScreen';
import { ClientAppointmentDetailScreen } from '../screens/Client/ClientAppointmentDetailScreen';
import { ClientProfessionalsListScreen } from '../screens/Client/ClientProfessionalsListScreen';
import { ClientBookingFormScreen } from '../screens/Client/ClientBookingFormScreen';
import { AccountScreen } from '../screens/Account/AccountScreen';

import type {
  ClientBookStackParamList,
  ClientHomeStackParamList,
  ClientTabParamList,
} from '../types';
import { CustomTabBar, HEADER_STYLE, TabIconConfig } from './CustomTabBar';

const Tab = createBottomTabNavigator<ClientTabParamList>();
const HomeStack = createStackNavigator<ClientHomeStackParamList>();
const BookStack = createStackNavigator<ClientBookStackParamList>();

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={HEADER_STYLE}>
      <HomeStack.Screen
        name="ClientHomeMain"
        component={ClientHomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ClientAppointmentDetail"
        component={ClientAppointmentDetailScreen}
        options={{ title: 'Atendimento' }}
      />
    </HomeStack.Navigator>
  );
}

function BookNavigator() {
  return (
    <BookStack.Navigator screenOptions={HEADER_STYLE}>
      <BookStack.Screen
        name="ClientProfessionalsList"
        component={ClientProfessionalsListScreen}
        options={{ headerShown: false }}
      />
      <BookStack.Screen
        name="ClientBookingForm"
        component={ClientBookingFormScreen}
        options={{ title: 'Novo agendamento' }}
      />
    </BookStack.Navigator>
  );
}

const TAB_ICONS: Record<string, TabIconConfig> = {
  ClientHome: { icon: 'home-variant', label: 'Início' },
  ClientBook: { icon: 'calendar-plus', label: 'Agendar' },
  Account: { icon: 'account-circle', label: 'Conta' },
};

export function ClientNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} iconsByName={TAB_ICONS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="ClientHome" component={HomeNavigator} />
      <Tab.Screen name="ClientBook" component={BookNavigator} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
