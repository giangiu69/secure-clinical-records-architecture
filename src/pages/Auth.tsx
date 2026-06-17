import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BrowserCompatibilityCheck } from '@/components/BrowserCompatibilityCheck';
import { z } from 'zod';

const authSchema = z.object({
  email: z.string().trim().email({ message: "Inserisci un indirizzo email valido" }),
  password: z.string().min(6, { message: "La password deve avere almeno 6 caratteri" }),
});

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateInput = () => {
    const result = authSchema.safeParse({ email, password });
    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      toast({
        title: "Errore di validazione",
        description: errors,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);

    if (error) {
      let message = "Errore durante l'accesso";
      if (error.message.startsWith('NETWORK_ERROR:')) {
        message = error.message.replace('NETWORK_ERROR: ', '');
      } else if (error.message.includes('Invalid login credentials')) {
        message = "Credenziali non valide. Verifica email e password.";
      } else if (error.message.includes('Email not confirmed')) {
        message = "Email non confermata. Controlla la tua casella di posta.";
      }
      toast({
        title: "Errore",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Accesso effettuato",
        description: "Benvenuto nel sistema SPR!",
      });
      navigate('/');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateInput()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      let message = "Errore durante la registrazione";
      if (error.message.startsWith('NETWORK_ERROR:')) {
        message = error.message.replace('NETWORK_ERROR: ', '');
      } else if (error.message.includes('User already registered')) {
        message = "Questo indirizzo email è già registrato. Prova ad accedere.";
      }
      toast({
        title: "Errore",
        description: message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Registrazione completata",
        description: "Account creato con successo. Puoi ora accedere.",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">SPR Flussi Riabilitativi</CardTitle>
          <CardDescription>
            Accedi per gestire i flussi SPR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrowserCompatibilityCheck />
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Accedi</TabsTrigger>
              <TabsTrigger value="signup">Registrati</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Accesso in corso..." : "Accedi"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="nome@esempio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Registrazione in corso..." : "Registrati"}
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center mt-4">
                Solo gli utenti autorizzati potranno accedere ai dati.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
