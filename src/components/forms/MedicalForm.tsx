import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingButton, FormLoadingStates } from '@/components/common/LoadingStates';
import { FormErrorDisplay } from '@/components/common/ErrorBoundary';
import { medicalFormSchema, MedicalFormData, BloodType } from '@/schemas/medicalForm';
import { Plus, Trash2, User, Heart, Phone, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MedicalFormProps {
  initialData?: Partial<MedicalFormData>;
  onSubmit: (data: MedicalFormData) => Promise<void>;
  isLoading?: boolean;
  error?: string | Error | null;
  className?: string;
}

const bloodTypes: BloodType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];


export function MedicalForm({ 
  initialData, 
  onSubmit, 
  isLoading = false, 
  error,
  className 
}: MedicalFormProps) {
  const [formState, setFormState] = React.useState<'idle' | 'validating' | 'submitting' | 'success' | 'error'>('idle');

  const form = useForm<MedicalFormData>({
    resolver: zodResolver(medicalFormSchema),
    defaultValues: {
      name: '',
      cpf: '',
      email: '',
      phone: '',
      birthDate: '',
      bloodType: 'O+',
      weight: 0,
      height: 0,
      allergies: [],
      hasAllergies: false,
      medications: [],
      hasMedications: false,
      medicalConditions: [],
      hasMedicalConditions: false,
      emergencyContacts: [
        { name: '', relationship: '', phone: '' }
      ],
      observations: '',
      ...initialData,
    },
  });

  const { 
    fields: allergyFields, 
    append: appendAllergy, 
    remove: removeAllergy 
  } = useFieldArray({
    control: form.control,
    name: 'allergies' as never,
  });

  const { 
    fields: medicationFields, 
    append: appendMedication, 
    remove: removeMedication 
  } = useFieldArray({
    control: form.control,
    name: 'medications',
  });

  const { 
    fields: conditionFields, 
    append: appendCondition, 
    remove: removeCondition 
  } = useFieldArray({
    control: form.control,
    name: 'medicalConditions' as never,
  });

  const { 
    fields: contactFields, 
    append: appendContact, 
    remove: removeContact 
  } = useFieldArray({
    control: form.control,
    name: 'emergencyContacts',
  });

  const hasAllergies = form.watch('hasAllergies');
  const hasMedications = form.watch('hasMedications');
  const hasMedicalConditions = form.watch('hasMedicalConditions');

  React.useEffect(() => {
    if (!hasAllergies) {
      form.setValue('allergies', []);
    }
  }, [hasAllergies, form]);

  React.useEffect(() => {
    if (!hasMedications) {
      form.setValue('medications', []);
    }
  }, [hasMedications, form]);

  React.useEffect(() => {
    if (!hasMedicalConditions) {
      form.setValue('medicalConditions', []);
    }
  }, [hasMedicalConditions, form]);

  const handleSubmit = async (data: MedicalFormData) => {
    try {
      setFormState('submitting');
      await onSubmit(data);
      setFormState('success');
    } catch (err) {
      setFormState('error');
      throw err;
    }
  };

  // Funções de formatação
  const formatCPF = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(\d{4})-(\d)(\d{4})/, '$1$2-$3')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  return (
    <div className={cn("w-full max-w-4xl mx-auto space-y-6", className)}>
      <FormErrorDisplay error={error || null} />
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <CardTitle>Dados Pessoais</CardTitle>
              </div>
              <CardDescription>
                Informações básicas para identificação
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="000.000.000-00" 
                        {...field}
                        onChange={(e) => field.onChange(formatCPF(e.target.value))}
                        maxLength={14}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="(00) 00000-0000" 
                        {...field}
                        onChange={(e) => field.onChange(formatPhone(e.target.value))}
                        maxLength={15}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Informações Médicas */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Heart className="h-5 w-5" />
                <CardTitle>Informações Médicas Básicas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bloodType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Sanguíneo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bloodTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="70" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Altura (cm)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="175" 
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Alergias */}
          <Card>
            <CardHeader>
              <CardTitle>Alergias</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasAllergies"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Possui alergias conhecidas</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasAllergies && (
                <div className="space-y-2">
                  {allergyFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Input
                        placeholder="Digite a alergia"
                        {...form.register(`allergies.${index}`)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeAllergy(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendAllergy('' as never)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Alergia
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medicações */}
          <Card>
            <CardHeader>
              <CardTitle>Medicações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasMedications"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Faz uso de medicações</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasMedications && (
                <div className="space-y-4">
                  {medicationFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                      <Input
                        placeholder="Nome do medicamento"
                        {...form.register(`medications.${index}.name`)}
                      />
                      <Input
                        placeholder="Dosagem"
                        {...form.register(`medications.${index}.dosage`)}
                      />
                      <Input
                        placeholder="Frequência"
                        {...form.register(`medications.${index}.frequency`)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMedication(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendMedication({ name: '', dosage: '', frequency: '' })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Medicação
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Condições Médicas */}
          <Card>
            <CardHeader>
              <CardTitle>Condições Médicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="hasMedicalConditions"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange} 
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Possui condições médicas</FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              {hasMedicalConditions && (
                <div className="space-y-2">
                  {conditionFields.map((field, index) => (
                    <div key={field.id} className="flex items-center space-x-2">
                      <Input
                        placeholder="Digite a condição médica"
                        {...form.register(`medicalConditions.${index}`)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeCondition(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCondition('' as never)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Condição
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Contatos de Emergência */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5" />
                <CardTitle>Contatos de Emergência</CardTitle>
              </div>
              <CardDescription>
                Pelo menos um contato de emergência é obrigatório
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
                  <Input
                    placeholder="Nome"
                    {...form.register(`emergencyContacts.${index}.name`)}
                  />
                  <Input
                    placeholder="Parentesco"
                    {...form.register(`emergencyContacts.${index}.relationship`)}
                  />
                  <Input
                    placeholder="(00) 00000-0000"
                    {...form.register(`emergencyContacts.${index}.phone`)}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      form.setValue(`emergencyContacts.${index}.phone`, formatted);
                    }}
                    maxLength={15}
                  />
                  {contactFields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeContact(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {contactFields.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendContact({ name: '', relationship: '', phone: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Contato
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Observações */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Observações Adicionais</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Informações adicionais relevantes para emergências..."
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo 500 caracteres
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Estado do formulário e botão de envio */}
          <div className="flex justify-between items-center">
            <FormLoadingStates state={formState} />
            <LoadingButton
              type="submit"
              isLoading={isLoading || formState === 'submitting'}
              loadingText="Salvando perfil..."
              className="w-full md:w-auto"
            >
              {initialData ? 'Atualizar Perfil' : 'Criar Perfil Médico'}
            </LoadingButton>
          </div>
        </form>
      </Form>
    </div>
  );
}