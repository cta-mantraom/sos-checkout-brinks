import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryProvider } from '@/providers/QueryProvider';
import { ErrorProvider } from '@/providers/ErrorProvider';
import { MercadoPagoProvider } from '@/contexts/MercadoPagoContext';

// Pages
import { HomePage } from '@/pages/HomePage';
import { MedicalFormPage } from '@/pages/MedicalFormPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { SuccessPage } from '@/pages/SuccessPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { PaymentStatusPage } from '@/pages/PaymentStatusPage';

// Layout Components
import { Toaster } from 'sonner';

// Global styles
import './index.css';

function AppRoutes() {
  return (
    <Routes>
      {/* Rota principal - Landing page */}
      <Route path="/" element={<HomePage />} />
      
      {/* Formulário médico - Primeira etapa */}
      <Route path="/medical-form" element={<MedicalFormPage />} />
      
      {/* Checkout - Segunda etapa */}
      <Route path="/checkout" element={<CheckoutPage />} />
      
      {/* Status do pagamento - Para PIX e outros pagamentos pendentes */}
      <Route path="/payment-status" element={<PaymentStatusPage />} />
      
      {/* Sucesso - Terceira etapa com QR Code */}
      <Route path="/success" element={<SuccessPage />} />
      
      {/* Visualizar perfil médico */}
      <Route path="/profile/:id" element={<ProfilePage />} />
      
      {/* Redirect para perfil se acessar /profile sem ID */}
      <Route path="/profile" element={<Navigate to="/" replace />} />
      
      {/* Catch all - Redirect para home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ErrorProvider>
      <QueryProvider>
        <MercadoPagoProvider>
          <Router>
            <div className="App">
              <AppRoutes />
              
              {/* Toast notifications */}
              <Toaster 
                position="top-right"
                richColors
                closeButton
                duration={5000}
                toastOptions={{
                  style: {
                    background: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    color: 'hsl(var(--foreground))',
                  },
                }}
              />
            </div>
          </Router>
        </MercadoPagoProvider>
      </QueryProvider>
    </ErrorProvider>
  );
}

export default App;
