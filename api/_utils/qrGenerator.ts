import * as QRCode from 'qrcode';
import { IQRCodeGenerator } from '../../lib/domain/services/QRCodeService.js';

export class SimpleQRCodeGenerator implements IQRCodeGenerator {
  async generateQR(data: string): Promise<{ url: string; base64: string }> {
    try {
      // Configurações do QR Code
      const options = {
        errorCorrectionLevel: 'M' as const,
        type: 'image/png' as const,
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      };

      // Gerar QR Code como Data URL
      const dataUrl = await QRCode.toDataURL(data, options);
      
      // Extrair base64 do Data URL
      const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

      return {
        url: dataUrl,
        base64
      };
    } catch (error) {
      throw new Error(`Erro ao gerar QR Code: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  async uploadQRImage(imageData: string, _profileId: string): Promise<string> {
    // Para simplicidade, vamos retornar uma URL de data
    // Em produção, você faria upload para um storage service (AWS S3, Cloudinary, etc.)
    
    try {
      const dataUrl = `data:image/png;base64,${imageData}`;
      
      // Simular upload retornando uma URL única
      // const timestamp = Date.now();
      // const mockUrl = `https://sos-storage.exemplo.com/qrcodes/${profileId}-${timestamp}.png`;
      
      // Em produção, aqui você faria:
      // const uploadResult = await this.storageService.upload(imageData, `qrcodes/${profileId}-${timestamp}.png`);
      // return uploadResult.url;
      
      // Por enquanto, retornar a data URL para funcionar sem storage externo
      return dataUrl;
      
    } catch (error) {
      throw new Error(`Erro ao fazer upload do QR Code: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }
}

// Factory function para criar o gerador baseado na configuração
export function createQRCodeGenerator(): IQRCodeGenerator {
  // Por enquanto, sempre usar o gerador simples
  // No futuro, pode escolher baseado em variáveis de ambiente
  return new SimpleQRCodeGenerator();
}