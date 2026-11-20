import { HStack, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { containerBackground, font, foregroundStyle, lineLimit, padding, widgetURL } from '@expo/ui/swift-ui/modifiers';
import { createWidget, type WidgetEnvironment } from 'expo-widgets';

import type { ExpiringWidgetProps } from '@/features/widget/widgetData';

/**
 * Widget d’écran d’accueil « À consommer vite ». Il s’exécute hors de l’app (directive 'widget') :
 * tout ce qu’il utilise doit être déclaré dans la fonction ; les données arrivent par les props.
 */
const ExpiringWidget = (props: ExpiringWidgetProps, environment: WidgetEnvironment) => {
  'widget';
  const dark = environment.colorScheme === 'dark';
  const colors = {
    background: dark ? '#0E1411' : '#F6F4EE',
    text: dark ? '#EEF2EF' : '#1B241F',
    muted: dark ? '#9AA79F' : '#5C665F',
    primary: dark ? '#7CC59A' : '#2F6B4F',
    urgent: dark ? '#F2B266' : '#B9650F',
    expired: dark ? '#FF9A8F' : '#B3261E',
  };
  const toneOf = (level: string) => (level === 'expired' ? colors.expired : level === 'urgent' ? colors.urgent : colors.primary);
  const count = props.urgentCount + props.expiredCount;
  const headline = count === 0 ? 'Rien ne presse' : `${count} à consommer`;
  const root = [containerBackground(colors.background, 'widget'), widgetURL('smartfridge://')];

  // Version gratuite : le widget invite à passer à Premium (un toucher ouvre l’offre dans l’app).
  if (props.locked) {
    const lockedRoot = [containerBackground(colors.background, 'widget'), widgetURL('smartfridge://premium?reason=widget')];
    return (
      <VStack alignment="leading" spacing={4} modifiers={lockedRoot}>
        <Text modifiers={[font({ weight: 'heavy', size: 15, design: 'rounded' }), foregroundStyle(colors.primary)]}>
          SmartFridge
        </Text>
        <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(colors.text)]}>Widget Premium</Text>
        <Text modifiers={[font({ size: 12 }), foregroundStyle(colors.muted)]}>Touchez pour voir ce qui périme ici.</Text>
      </VStack>
    );
  }

  if (environment.widgetFamily === 'accessoryRectangular' || environment.widgetFamily === 'accessoryInline') {
    const first = props.items[0];
    return (
      <VStack alignment="leading" spacing={1} modifiers={root}>
        <Text modifiers={[font({ weight: 'bold', size: 15 })]}>{headline}</Text>
        {first ? (
          <Text modifiers={[font({ size: 13 }), lineLimit(1)]}>
            {first.name} · {first.when}
          </Text>
        ) : (
          <Text modifiers={[font({ size: 13 })]}>SmartFridge</Text>
        )}
      </VStack>
    );
  }

  const small = environment.widgetFamily === 'systemSmall';
  const visible = props.items.slice(0, small ? 2 : 4);

  return (
    <VStack alignment="leading" spacing={small ? 4 : 6} modifiers={root}>
      {small ? (
        <VStack alignment="leading" spacing={0}>
          <HStack>
            <Text
              modifiers={[
                font({ weight: 'heavy', size: 30, design: 'rounded' }),
                foregroundStyle(count > 0 ? colors.urgent : colors.primary),
              ]}
            >
              {String(count)}
            </Text>
            <Spacer />
          </HStack>
          <Text modifiers={[font({ weight: 'bold', size: 12 }), foregroundStyle(colors.text), lineLimit(1)]}>
            {count === 0 ? 'Rien ne presse' : 'à consommer vite'}
          </Text>
        </VStack>
      ) : (
        <HStack spacing={6}>
          <Text
            modifiers={[
              font({ weight: 'heavy', size: 26, design: 'rounded' }),
              foregroundStyle(count > 0 ? colors.urgent : colors.primary),
            ]}
          >
            {String(count)}
          </Text>
          <VStack alignment="leading" spacing={0}>
            <Text modifiers={[font({ weight: 'bold', size: 13 }), foregroundStyle(colors.text), lineLimit(1)]}>
              {count === 0 ? 'Rien ne presse' : 'à consommer vite'}
            </Text>
            <Text modifiers={[font({ size: 11 }), foregroundStyle(colors.muted)]}>
              {props.expiredCount > 0 ? `dont ${props.expiredCount} périmé${props.expiredCount > 1 ? 's' : ''}` : 'SmartFridge'}
            </Text>
          </VStack>
          <Spacer />
        </HStack>
      )}

      {visible.length === 0 ? (
        <Text modifiers={[font({ size: 12 }), foregroundStyle(colors.muted), padding({ top: 4 })]}>
          Tout est sous contrôle dans votre frigo.
        </Text>
      ) : (
        visible.map((item) => (
          <HStack key={item.name} spacing={6}>
            <Text modifiers={[font({ size: 9 }), foregroundStyle(toneOf(item.level))]}>●</Text>
            <Text modifiers={[font({ weight: 'semibold', size: small ? 12 : 13 }), foregroundStyle(colors.text), lineLimit(1)]}>
              {item.name}
            </Text>
            <Spacer />
            {small ? null : (
              <Text modifiers={[font({ size: 12 }), foregroundStyle(toneOf(item.level)), lineLimit(1)]}>{item.when}</Text>
            )}
          </HStack>
        ))
      )}
      <Spacer />
    </VStack>
  );
};

export default createWidget<ExpiringWidgetProps>('ExpiringWidget', ExpiringWidget);
