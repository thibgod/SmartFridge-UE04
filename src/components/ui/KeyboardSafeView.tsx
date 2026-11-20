import { useRef, useState, type PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Garde le bas de l’écran (bouton « Enregistrer ») au-dessus du clavier.
 * Le décalage est mesuré à l’écran : il reste juste dans une feuille modale iOS,
 * avec ou sans barre de titre, quelle que soit la taille de l’appareil.
 */
export function KeyboardSafeView({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const ref = useRef<View>(null);
  const [offset, setOffset] = useState(0);

  if (Platform.OS !== 'ios') return <View style={style}>{children}</View>;

  return (
    <KeyboardAvoidingView behavior="padding" keyboardVerticalOffset={offset} style={style}>
      <View
        ref={ref}
        style={{ flex: 1 }}
        onLayout={() => ref.current?.measureInWindow((_x, y) => setOffset((prev) => (Math.abs(prev - y) < 1 ? prev : y)))}
      >
        {children}
      </View>
    </KeyboardAvoidingView>
  );
}
