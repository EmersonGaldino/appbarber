import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import { ProfessionalScheduleScreen } from '../screens/Professional/ProfessionalScheduleScreen';
import { AppointmentDetailScreen } from '../screens/Schedule/AppointmentDetailScreen';
import { AppointmentFormScreen } from '../screens/Schedule/AppointmentFormScreen';
import { AccountScreen } from '../screens/Account/AccountScreen';
import type {
  ProfessionalScheduleStackParamList,
  ProfessionalTabParamList,
} from '../types';
import { CustomTabBar, HEADER_STYLE, TabIconConfig } from './CustomTabBar';

const Tab = createBottomTabNavigator<ProfessionalTabParamList>();
// Stack próprio do profissional. Reaproveitamos as telas Detail/Form do admin
// para manter o fluxo de "atualizar status" e "editar atendimento" consistente.
const Stack = createStackNavigator<ProfessionalScheduleStackParamList>();

function ProfessionalScheduleNavigator() {
  return (
    <Stack.Navigator screenOptions={HEADER_STYLE}>
      <Stack.Screen
        name="ProfessionalScheduleMain"
        component={ProfessionalScheduleScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AppointmentDetail"
        component={AppointmentDetailScreen}
        options={{ title: 'Atendimento' }}
      />
      <Stack.Screen name="AppointmentForm" component={AppointmentFormScreen} />
    </Stack.Navigator>
  );
}

const TAB_ICONS: Record<string, TabIconConfig> = {
  MySchedule: { icon: 'calendar-month', label: 'Agenda' },
  Account: { icon: 'account-circle', label: 'Conta' },
};

export function ProfessionalNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} iconsByName={TAB_ICONS} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="MySchedule" component={ProfessionalScheduleNavigator} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}
