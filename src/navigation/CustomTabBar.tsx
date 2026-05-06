import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography } from '../theme';
import { PressableScale } from '../components/PressableScale';

export interface TabIconConfig {
  icon: string;
  label: string;
}

interface Props extends BottomTabBarProps {
  iconsByName: Record<string, TabIconConfig>;
}

export function CustomTabBar({ state, navigation, iconsByName }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBarWrap, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const cfg = iconsByName[route.name];
          if (!cfg) return null;

          return (
            <TabButton
              key={route.key}
              icon={cfg.icon}
              label={cfg.label}
              focused={focused}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  icon,
  label,
  focused,
  onPress,
}: {
  icon: string;
  label: string;
  focused: boolean;
  onPress: () => void;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  React.useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, {
      damping: 18,
      stiffness: 240,
      mass: 0.6,
    });
  }, [focused, progress]);

  // Ícone sobe 4px e fica ligeiramente maior quando ativo.
  const iconWrapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -4], Extrapolate.CLAMP) },
      { scale: interpolate(progress.value, [0, 1], [1, 1.08], Extrapolate.CLAMP) },
    ],
  }));

  // Ponto dourado: aparece e cresce quando ativa.
  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.2, 1], Extrapolate.CLAMP) },
    ],
  }));

  // Label só aparece na ativa, com fade + slide curto.
  const labelStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [-4, 0], Extrapolate.CLAMP) },
    ],
  }));

  return (
    <PressableScale haptic={null} onPress={onPress} style={styles.tabBtn} scale={0.94}>
      <Animated.View style={[styles.iconWrap, iconWrapStyle]}>
        <MaterialCommunityIcons
          name={icon as any}
          size={24}
          color={focused ? colors.primary : colors.textMuted}
        />
      </Animated.View>

      <Animated.View style={[styles.dot, dotStyle]} pointerEvents="none" />

      <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
        {label}
      </Animated.Text>
    </PressableScale>
  );
}

export const HEADER_STYLE = {
  headerStyle: {
    backgroundColor: colors.surface,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '800' as const, fontSize: 17 },
  headerBackTitleStyle: { fontWeight: '600' as const },
};

const styles = StyleSheet.create({
  tabBarWrap: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: -2 },
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 4,
    minHeight: 56,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  label: {
    ...typography.small,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.2,
    marginTop: 3,
  },
});
