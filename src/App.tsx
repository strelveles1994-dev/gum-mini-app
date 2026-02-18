import { useEffect } from "react";

function App() {
  useEffect(() => {
    const tg = (window as any).Telegram?.WebApp;

    if (tg) {
      tg.ready();
      tg.expand();
    }
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Gym Check</h1>
      <p>Telegram Mini App подключён</p>
    </div>
  );
}

export default App;