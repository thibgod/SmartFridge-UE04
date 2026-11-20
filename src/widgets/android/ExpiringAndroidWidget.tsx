import { FlexWidget, TextWidget, type ColorProp } from 'react-native-android-widget';

import type { ExpiringWidgetProps } from '@/features/widget/widgetData';

interface Palette {
  background: ColorProp;
  text: ColorProp;
  muted: ColorProp;
  primary: ColorProp;
  urgent: ColorProp;
  expired: ColorProp;
}

/** Mêmes couleurs que le widget iOS. */
export const LIGHT: Palette = {
  background: '#F6F4EE',
  text: '#1B241F',
  muted: '#5C665F',
  primary: '#2F6B4F',
  urgent: '#B9650F',
  expired: '#B3261E',
};

export const DARK: Palette = {
  background: '#0E1411',
  text: '#EEF2EF',
  muted: '#9AA79F',
  primary: '#7CC59A',
  urgent: '#F2B266',
  expired: '#FF9A8F',
};

/** Hauteur d’une ligne de produit et de l’en-tête, en dp, pour afficher ce qui tient vraiment. */
const ROW_HEIGHT = 24;
const HEADER_HEIGHT = 62;

interface ExpiringAndroidWidgetProps {
  data: ExpiringWidgetProps;
  height: number;
  palette: Palette;
}

export function ExpiringAndroidWidget({ data, height, palette }: ExpiringAndroidWidgetProps) {
  const root = {
    height: 'match_parent',
    width: 'match_parent',
    padding: 14,
    borderRadius: 22,
    backgroundColor: palette.background,
  } as const;

  // Version gratuite : le widget invite à passer à Premium (un toucher ouvre l’offre dans l’app).
  if (data.locked) {
    return (
      <FlexWidget
        style={{ ...root, justifyContent: 'center', flexGap: 4 }}
        clickAction="OPEN_URI"
        clickActionData={{ uri: 'smartfridge://premium?reason=widget' }}
        accessibilityLabel="Widget Premium. Touchez pour découvrir l’offre."
      >
        <TextWidget text="SmartFridge" style={{ fontSize: 15, fontWeight: '800', color: palette.primary }} />
        <TextWidget text="Widget Premium" style={{ fontSize: 13, fontWeight: '700', color: palette.text }} />
        <TextWidget text="Touchez pour voir ce qui périme ici." maxLines={2} style={{ fontSize: 12, color: palette.muted }} />
      </FlexWidget>
    );
  }

  const count = data.urgentCount + data.expiredCount;
  const fits = Math.max(1, Math.floor((height - HEADER_HEIGHT) / ROW_HEIGHT));
  const visible = data.items.slice(0, fits);
  const caption = data.expiredCount > 0 ? `dont ${data.expiredCount} périmé${data.expiredCount > 1 ? 's' : ''}` : 'SmartFridge';
  const label = count === 0 ? 'Rien ne presse' : `${count} à consommer vite, ${visible.map((i) => `${i.name} ${i.when}`).join(', ')}`;

  return (
    <FlexWidget style={{ ...root, flexGap: 6 }} clickAction="OPEN_APP" accessibilityLabel={label}>
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 8, width: 'match_parent' }}>
        <TextWidget
          text={String(count)}
          style={{ fontSize: 26, fontWeight: '800', color: count > 0 ? palette.urgent : palette.primary }}
        />
        <FlexWidget style={{ flex: 1 }}>
          <TextWidget
            text={count === 0 ? 'Rien ne presse' : 'à consommer vite'}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 13, fontWeight: '700', color: palette.text }}
          />
          <TextWidget text={caption} maxLines={1} style={{ fontSize: 11, color: palette.muted }} />
        </FlexWidget>
      </FlexWidget>

      {visible.length === 0 ? (
        <TextWidget text="Tout est sous contrôle dans votre frigo." maxLines={2} style={{ fontSize: 12, color: palette.muted }} />
      ) : (
        visible.map((item) => {
          const tone = item.level === 'expired' ? palette.expired : palette.urgent;
          return (
            <FlexWidget
              key={`${item.name}-${item.when}`}
              style={{ flexDirection: 'row', alignItems: 'center', flexGap: 6, width: 'match_parent' }}
            >
              <TextWidget text="●" style={{ fontSize: 9, color: tone }} />
              <FlexWidget style={{ flex: 1 }}>
                <TextWidget
                  text={item.name}
                  maxLines={1}
                  truncate="END"
                  style={{ fontSize: 13, fontWeight: '600', color: palette.text }}
                />
              </FlexWidget>
              <TextWidget text={item.when} maxLines={1} style={{ fontSize: 12, fontWeight: '700', color: tone }} />
            </FlexWidget>
          );
        })
      )}
    </FlexWidget>
  );
}
