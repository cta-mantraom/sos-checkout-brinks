import { useNavigate, useLocation } from 'react-router-dom';
import { MedicalForm } from '@/components/forms/MedicalForm';
// Removido useCreateProfile - perfil só é criado após pagamento aprovado
import { MedicalFormData } from '@/schemas/medicalForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, Clock, FileText } from 'lucide-react';

export function MedicalFormPage() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const selectedPlan = (location.state?.selectedPlan || 'basic') as 'basic' | 'premium';
  // IMPORTANTE: NÃO criar perfil antes do pagamento!
  // Perfil só será criado após confirmação do pagamento via webhook
  const handleSubmit = async (data: MedicalFormData) => {
    try {
      // Navegar direto para checkout com os dados do formulário
      // SEM criar perfil no banco de dados
      navigate('/checkout', { 
        state: { 
          formData: data,  // Dados do formulário, não salvos ainda
          selectedPlan,
          profileData: null  // Sem perfil criado ainda
        } 
      });
    } catch (error) {
      console.error('Erro ao processar formulário:', error);
      // O erro será tratado pelo componente MedicalForm
    }
  };

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleGoBack}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Criar Perfil Médico</h1>
              <p className="text-muted-foreground">Preencha suas informações médicas com cuidado</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar com informações */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Segurança dos Dados</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                  <span>Criptografia SSL/TLS</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                  <span>Dados protegidos pela LGPD</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                  <span>Acesso controlado</span>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 shrink-0"></div>
                  <span>Backup automático</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Tempo Estimado</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-muted-foreground mb-2">
                  Leva cerca de <strong>10-15 minutos</strong> para preencher completamente
                </p>
                <div className="space-y-1 text-xs">
                  <div>• Dados pessoais: 2-3 min</div>
                  <div>• Informações médicas: 3-5 min</div>
                  <div>• Medicações/alergias: 3-5 min</div>
                  <div>• Contatos emergência: 2-3 min</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Dicas Importantes</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Alert>
                  <AlertDescription>
                    <strong>Seja preciso:</strong> Informações incorretas podem comprometer o atendimento médico.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <div>• Mantenha medicações atualizadas</div>
                  <div>• Liste todas as alergias conhecidas</div>
                  <div>• Inclua condições médicas relevantes</div>
                  <div>• Verifique contatos de emergência</div>
                </div>
              </CardContent>
            </Card>

            {/* Progress indicator */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progresso</span>
                    <span>Etapa 1 de 3</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-primary h-2 rounded-full w-1/3 transition-all duration-300"></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Após preencher, você escolherá seu plano de proteção
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Formulário principal */}
          <div className="lg:col-span-3">
            <MedicalForm
              onSubmit={handleSubmit}
              isLoading={false}  // Não há loading, apenas navegação
              error={undefined}  // Erros serão tratados no checkout
              className="w-full"
            />
            
            {/* Informações sobre os próximos passos */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Próximos Passos</CardTitle>
                <CardDescription>
                  O que acontece após criar seu perfil médico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">2</span>
                    </div>
                    <h4 className="font-medium">Escolher Plano</h4>
                    <p className="text-muted-foreground">
                      Selecione o plano que melhor atende suas necessidades
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">3</span>
                    </div>
                    <h4 className="font-medium">Pagamento Seguro</h4>
                    <p className="text-muted-foreground">
                      Finalize com pagamento via PIX, cartão ou boleto
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">4</span>
                    </div>
                    <h4 className="font-medium">Receber QR Code</h4>
                    <p className="text-muted-foreground">
                      Sua proteção médica estará ativa imediatamente
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}