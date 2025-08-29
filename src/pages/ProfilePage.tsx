import { useParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useQRCode } from '@/hooks/useQRCode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingCard, LoadingError } from '@/components/common/LoadingStates';
import { 
  User, 
  Heart, 
  Phone, 
  Mail, 
  Calendar, 
  Droplets,
  Pill,
  AlertTriangle,
  FileText,
  QrCode,
  Edit,
  ArrowLeft,
  Shield,
  Clock
} from 'lucide-react';

export function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { data: profile, isLoading, error, refetch } = useProfile(id);
  const { data: qrData } = useQRCode(id);

  const handleGoBack = () => {
    navigate('/');
  };

  const handleEditProfile = () => {
    navigate(`/medical-form`, { 
      state: { 
        editMode: true,
        profileId: id,
        initialData: profile 
      } 
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <LoadingCard message="Carregando perfil médico..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <LoadingError 
            error={error instanceof Error ? error : new Error('Erro ao carregar perfil')}
            onRetry={() => refetch()}
          />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Perfil não encontrado</h3>
              <p className="text-muted-foreground mb-4">
                O perfil médico solicitado não foi encontrado ou você não tem permissão para acessá-lo.
              </p>
              <Button onClick={handleGoBack}>
                Voltar ao Início
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatPhone = (phone: string) => {
    return phone.replace(/(\d{2})(\d{4,5})(\d{4})/, '($1) $2-$3');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <h1 className="text-2xl font-bold">Perfil Médico</h1>
                <p className="text-muted-foreground">Informações de emergência</p>
              </div>
            </div>
            <Button onClick={handleEditProfile} className="flex items-center">
              <Edit className="h-4 w-4 mr-2" />
              Editar Perfil
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <CardTitle>Dados Pessoais</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                  <p className="text-lg font-medium">{profile.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Idade</label>
                  <p className="text-lg">{calculateAge(profile.birthDate)} anos</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="flex items-center space-x-2">
                    <Phone className="h-4 w-4" />
                    <span>{formatPhone(profile.phone)}</span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                  <p className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(profile.birthDate)}</span>
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p>{profile.cpf}</p>
                </div>
              </CardContent>
            </Card>

            {/* Informações Médicas */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Heart className="h-5 w-5" />
                  <CardTitle>Informações Médicas</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</label>
                  <div className="flex items-center space-x-2">
                    <Droplets className="h-4 w-4 text-red-500" />
                    <Badge variant="outline" className="text-lg font-bold">
                      {profile.bloodType}
                    </Badge>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Peso</label>
                  <p className="text-lg">{profile.weight} kg</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Altura</label>
                  <p className="text-lg">{profile.height} cm</p>
                </div>
              </CardContent>
            </Card>

            {/* Alergias */}
            {profile.allergies && profile.allergies.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <CardTitle>Alergias</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.allergies.map((allergy, index) => (
                      <Badge key={index} variant="destructive">
                        {allergy}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Medicações */}
            {profile.medications && profile.medications.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Pill className="h-5 w-5 text-blue-500" />
                    <CardTitle>Medicações</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.medications.map((medication, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <h4 className="font-medium">{medication.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          <strong>Dosagem:</strong> {medication.dosage} | 
                          <strong> Frequência:</strong> {medication.frequency}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Condições Médicas */}
            {profile.medicalConditions && profile.medicalConditions.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <CardTitle>Condições Médicas</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.medicalConditions.map((condition, index) => (
                      <Badge key={index} variant="secondary">
                        {condition}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Observações */}
            {profile.observations && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <CardTitle>Observações Adicionais</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{profile.observations}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Status do QR Code */}
            {qrData && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <QrCode className="h-5 w-5" />
                    <CardTitle className="text-lg">QR Code</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <QrCode className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <Badge variant="secondary">Ativo</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Criado:</span>
                      <span>{formatDate(qrData.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expira:</span>
                      <span>{formatDate(qrData.expiresAt)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/success', { 
                      state: { 
                        profileId: id, 
                        profileData: profile 
                      } 
                    })}
                  >
                    Ver QR Code Completo
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Contatos de Emergência */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Phone className="h-5 w-5" />
                  <CardTitle className="text-lg">Contatos de Emergência</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {profile.emergencyContacts.map((contact, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <h4 className="font-medium">{contact.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {contact.relationship}
                    </p>
                    <p className="text-sm font-mono">
                      {formatPhone(contact.phone)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Informações do Médico */}
            {profile.doctor && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Médico</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {profile.doctor.name && (
                    <div>
                      <strong>Nome:</strong> {profile.doctor.name}
                    </div>
                  )}
                  {profile.doctor.specialty && (
                    <div>
                      <strong>Especialidade:</strong> {profile.doctor.specialty}
                    </div>
                  )}
                  {profile.doctor.phone && (
                    <div>
                      <strong>Telefone:</strong> {formatPhone(profile.doctor.phone)}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Convênio */}
            {profile.healthInsurance && (
              <Card>
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <CardTitle className="text-lg">Convênio Médico</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {profile.healthInsurance.company && (
                    <div>
                      <strong>Operadora:</strong> {profile.healthInsurance.company}
                    </div>
                  )}
                  {profile.healthInsurance.plan && (
                    <div>
                      <strong>Plano:</strong> {profile.healthInsurance.plan}
                    </div>
                  )}
                  {profile.healthInsurance.cardNumber && (
                    <div>
                      <strong>Número:</strong> {profile.healthInsurance.cardNumber}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Informações do Sistema */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <CardTitle className="text-lg">Sistema</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Criado em:</span>
                  <span>{formatDate(profile.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Atualizado:</span>
                  <span>{formatDate(profile.updatedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ID:</span>
                  <span className="font-mono">{id?.slice(-8)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}