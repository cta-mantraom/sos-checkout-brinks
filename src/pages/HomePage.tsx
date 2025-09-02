import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  Shield,
  Smartphone,
  Clock,
  Users,
  Star,
  CheckCircle,
  ArrowRight,
  QrCode,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: <QrCode className="h-6 w-6" />,
    title: "QR Code Médico",
    description:
      "Acesso instantâneo às suas informações médicas em emergências",
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: "Dados Seguros",
    description: "Suas informações protegidas com criptografia de ponta",
  },
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: "Acesso Móvel",
    description: "Disponível 24/7 em qualquer dispositivo com internet",
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: "Atendimento Rápido",
    description: "Acelere o atendimento médico com informações organizadas",
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: "Contatos de Emergência",
    description: "Seus contatos sempre à mão quando mais precisar",
  },
  {
    icon: <Heart className="h-6 w-6" />,
    title: "Perfil Completo",
    description: "Alergias, medicações, condições médicas e mais",
  },
];

const testimonials = [
  {
    name: "Dr. Carlos Silva",
    role: "Médico Emergencista",
    content:
      "O SOS Checkout revolucionou o atendimento de emergência. Acesso rápido às informações vitais salva vidas.",
    rating: 5,
  },
  {
    name: "Maria Santos",
    role: "Usuária Premium",
    content:
      "Como diabética, ter minhas informações sempre acessíveis me dá muita segurança. Recomendo!",
    rating: 5,
  },
  {
    name: "João Oliveira",
    role: "Usuário Básico",
    content:
      "Fácil de usar e muito útil. Já salvou minha vida quando tive uma reação alérgica.",
    rating: 5,
  },
];

const plans = [
  {
    name: "Básico",
    price: 5.0,
    duration: "30 dias",
    description: "Ideal para começar",
    features: [
      "Perfil médico completo",
      "QR Code personalizado",
      "Acesso móvel 24/7",
      "Contatos de emergência",
      "Suporte por email",
    ],
    popular: false,
  },
  {
    name: "Premium",
    price: 5.0,
    duration: "365 dias",
    description: "Máxima proteção",
    features: [
      "Tudo do plano Básico",
      "Validade de 1 ano completo",
      "Backup automático",
      "Histórico de acessos",
      "Suporte prioritário 24/7",
      "Múltiplos QR Codes",
    ],
    popular: true,
  },
];

export function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative px-4 py-16 md:py-24 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="px-4 py-2">
                <Zap className="h-4 w-4 mr-2" />
                Proteção médica inteligente
              </Badge>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Suas informações médicas{" "}
                <span className="text-primary">sempre à mão</span>
              </h1>

              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Tenha acesso rápido e seguro ao seu perfil médico em
                emergências. QR Code personalizado com todas as informações
                vitais para salvar vidas.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg" className="text-lg px-8">
                <Link to="/medical-form">
                  Criar Perfil Médico
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8"
                asChild
              >
                <Link to="#como-funciona">Como Funciona</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="como-funciona" className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Como o SOS Checkout funciona
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Três passos simples para ter sua proteção médica sempre disponível
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold">Criar Perfil</h3>
              <p className="text-muted-foreground">
                Preencha suas informações médicas de forma segura e completa
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold">Gerar QR Code</h3>
              <p className="text-muted-foreground">
                Receba seu QR Code personalizado para acessar rapidamente
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold">Usar em Emergências</h3>
              <p className="text-muted-foreground">
                Profissionais de saúde acessam suas informações instantaneamente
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                    <div className="text-primary">{feature.icon}</div>
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-16 md:py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              O que dizem sobre nós
            </h2>
            <p className="text-xl text-muted-foreground">
              Histórias reais de pessoas que confiam no SOS Checkout
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-yellow-400 text-yellow-400"
                      />
                    ))}
                  </div>
                  <blockquote className="text-muted-foreground mb-4">
                    "{testimonial.content}"
                  </blockquote>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {testimonial.role}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-4 py-16 md:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Escolha seu plano
            </h2>
            <p className="text-xl text-muted-foreground">
              Proteção médica que cabe no seu orçamento
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={cn(
                  "relative",
                  plan.popular && "border-primary shadow-lg scale-105"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    Mais Popular
                  </Badge>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      R$ {plan.price.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-muted-foreground">
                      /{plan.duration}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    size="lg"
                  >
                    <Link
                      to="/medical-form"
                      state={{ selectedPlan: plan.name.toLowerCase() }}
                    >
                      Começar Agora
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl md:text-4xl font-bold">
            Pronto para ter sua proteção médica?
          </h2>
          <p className="text-xl opacity-90">
            Junte-se a milhares de pessoas que já protegem suas informações
            médicas conosco. Comece hoje mesmo e tenha peace of mind em qualquer
            emergência.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-lg px-8"
            >
              <Link to="/medical-form">
                Criar Meu Perfil Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-4 py-12 bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <h3 className="font-bold text-white text-lg">SOS Checkout</h3>
              <p className="text-sm">
                Suas informações médicas seguras e acessíveis em qualquer
                emergência.
              </p>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Produto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/medical-form" className="hover:text-white">
                    Criar Perfil
                  </Link>
                </li>
                <li>
                  <Link to="/#como-funciona" className="hover:text-white">
                    Como Funciona
                  </Link>
                </li>
                <li>
                  <Link to="/plans" className="hover:text-white">
                    Planos
                  </Link>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Suporte</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="mailto:suporte@soscheckout.com"
                    className="hover:text-white"
                  >
                    Contato
                  </a>
                </li>
                <li>
                  <a href="/faq" className="hover:text-white">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="/help" className="hover:text-white">
                    Central de Ajuda
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold text-white">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy" className="hover:text-white">
                    Privacidade
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white">
                    Termos de Uso
                  </a>
                </li>
                <li>
                  <a href="/security" className="hover:text-white">
                    Segurança
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2024 SOS Checkout. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
