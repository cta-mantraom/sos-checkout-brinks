import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface QRCodeData {
  profileId: string;
  qrCode: string;
  shortUrl: string;
  expiresAt: string;
  createdAt: string;
}

interface QRCodeGenerateRequest {
  profileId: string;
  regenerate?: boolean;
}

async function generateQRCode(data: QRCodeGenerateRequest): Promise<QRCodeData> {
  const response = await fetch('/api/generate-qr', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao gerar QR Code');
  }

  return response.json();
}

async function getQRCodeByProfile(profileId: string): Promise<QRCodeData | null> {
  const response = await fetch(`/api/get-qr?profileId=${profileId}`);
  
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao buscar QR Code');
  }

  return response.json();
}

export function useQRCode(profileId?: string) {
  return useQuery({
    queryKey: ['qrcode', profileId],
    queryFn: () => getQRCodeByProfile(profileId!),
    enabled: !!profileId,
    staleTime: 10 * 60 * 1000, // 10 minutos
    retry: 2,
  });
}

export function useGenerateQRCode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: generateQRCode,
    onSuccess: (data) => {
      // Atualiza o QR Code no cache
      queryClient.setQueryData(['qrcode', data.profileId], data);
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['qrcode', data.profileId] });
    },
    onError: (error) => {
      console.error('Erro ao gerar QR Code:', error);
    },
  });
}

export function useRegenerateQRCode() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (profileId: string) => 
      generateQRCode({ profileId, regenerate: true }),
    onSuccess: (data) => {
      // Atualiza o QR Code no cache
      queryClient.setQueryData(['qrcode', data.profileId], data);
      // Invalida queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['qrcode', data.profileId] });
    },
    onError: (error) => {
      console.error('Erro ao regenerar QR Code:', error);
    },
  });
}

// Hook para validar e verificar status do QR Code
export function useQRCodeValidation() {
  const checkExpiration = (expiresAt: string): boolean => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    return now < expirationDate;
  };

  const getTimeUntilExpiration = (expiresAt: string): string => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'Expirado';
    }

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays} dia${diffDays > 1 ? 's' : ''}`;
    } else if (diffHours > 0) {
      return `${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    } else {
      return `${diffMinutes} minuto${diffMinutes > 1 ? 's' : ''}`;
    }
  };

  const shouldRegenerate = (expiresAt: string): boolean => {
    const expirationDate = new Date(expiresAt);
    const now = new Date();
    const diffMs = expirationDate.getTime() - now.getTime();
    
    // Sugere regenerar se restam menos de 24 horas
    return diffMs < (24 * 60 * 60 * 1000);
  };

  return {
    checkExpiration,
    getTimeUntilExpiration,
    shouldRegenerate,
  };
}

// Hook para compartilhamento do QR Code
export function useQRCodeShare() {
  const shareQRCode = async (qrData: QRCodeData, profileName: string) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QR Code Médico - ${profileName}`,
          text: `Acesse meu perfil médico de emergência: ${profileName}`,
          url: qrData.shortUrl,
        });
        return true;
      } catch (error) {
        console.log('Compartilhamento cancelado pelo usuário');
        return false;
      }
    }
    
    // Fallback: copiar para clipboard
    try {
      await navigator.clipboard.writeText(qrData.shortUrl);
      return true;
    } catch (error) {
      console.error('Erro ao copiar para clipboard:', error);
      return false;
    }
  };

  const downloadQRCode = (qrCodeDataUrl: string, profileName: string) => {
    const link = document.createElement('a');
    link.download = `qr-code-${profileName.replace(/\s+/g, '-').toLowerCase()}.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return {
    shareQRCode,
    downloadQRCode,
  };
}