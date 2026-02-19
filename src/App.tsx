import { useEffect, useMemo, useState } from "react";

type TgUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
};

type TgWebApp = {
  ready: () => void;
  expand: () => void;
  initData?: string;
  initDataUnsafe?: { user?: TgUser };
  colorScheme?: string;
  platform?: string;
  version?: string;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TgWebApp };
  }
}

export default function App() {
  const tg = useMemo(() => window.Telegram?.WebApp, []);
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    if (!tg) return;

    tg.ready();
    tg.expand();

    setInfo({
      platform: tg.platform,
      version: tg.version,
      colorScheme: tg.colorScheme,
      initDataPresent: Boolean(tg.initData && tg.initData.length > 0),
      user: tg.initDataUnsafe?.user ?? null,
    });
  }, [tg]);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui, -apple-system" }}>
      <h1>Gym Check</h1>
      <p>Telegram Mini App подключён</p>

      {!tg && (
        <div style={{ marginTop: 20 }}>
          WebApp API не найден. Открой через Telegram.
        </div>
      )}

      {tg && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(info, null, 2)}
        </pre>
      )}
    </div>
  );
}
