import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, WifiOff, ShieldAlert } from 'lucide-react';

interface DiagnosticResult {
  localStorageAvailable: boolean;
  connectivityOk: boolean;
  checking: boolean;
}

export function BrowserCompatibilityCheck() {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult>({
    localStorageAvailable: true,
    connectivityOk: true,
    checking: true,
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      // Test localStorage
      let localStorageOk = true;
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
      } catch {
        localStorageOk = false;
      }

      // Test connectivity to Supabase
      let connectivityOk = true;
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (supabaseUrl) {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 8000);
          const res = await fetch(`${supabaseUrl}/auth/v1/health`, {
            method: 'GET',
            signal: controller.signal,
          });
          clearTimeout(timeout);
          connectivityOk = res.ok;
        }
      } catch {
        connectivityOk = false;
      }

      setDiagnostic({
        localStorageAvailable: localStorageOk,
        connectivityOk,
        checking: false,
      });
    };

    runDiagnostics();
  }, []);

  if (diagnostic.checking) return null;
  if (diagnostic.localStorageAvailable && diagnostic.connectivityOk) return null;

  return (
    <div className="space-y-3 mb-4">
      {!diagnostic.connectivityOk && (
        <Alert variant="destructive">
          <WifiOff className="h-4 w-4" />
          <AlertTitle>Connessione al server bloccata</AlertTitle>
          <AlertDescription>
            Il browser non riesce a raggiungere il server di autenticazione. Questo può dipendere da:
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Estensioni ad-blocker o privacy (provare a disabilitarle)</li>
              <li>Protezione anti-tracciamento del browser (Firefox, Edge, Brave)</li>
              <li>Rete aziendale con restrizioni o firewall/proxy</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {!diagnostic.localStorageAvailable && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Archiviazione locale non disponibile</AlertTitle>
          <AlertDescription>
            Il browser non consente l'archiviazione locale dei dati di sessione. Questo impedisce il login.
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>Se sei in navigazione privata/incognito, prova in modalità normale</li>
              <li>Verifica le impostazioni di privacy del browser e abilita i cookie</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
