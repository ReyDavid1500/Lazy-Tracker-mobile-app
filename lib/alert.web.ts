import type { AlertButton } from 'react-native';

// react-native-web's Alert.alert is a no-op, so map it onto the browser dialogs.
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    const text = message ? `${title}\n\n${message}` : title;

    if (!buttons || buttons.length < 2) {
      window.alert(text);
      buttons?.[0]?.onPress?.();
      return;
    }

    const cancel = buttons.find((b) => b.style === 'cancel');
    const confirm = buttons.find((b) => b !== cancel) ?? buttons[0];
    (window.confirm(text) ? confirm : cancel)?.onPress?.();
  },
};
