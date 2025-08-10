import { useState, useCallback } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  bucket: string;
  path?: string;
  onUpload: (url: string) => void;
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
  currentImage?: string;
}

export function ImageUpload({
  bucket,
  path = '',
  onUpload,
  className = '',
  maxWidth = 400,
  maxHeight = 400,
  currentImage
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const { toast } = useToast();
  
  // Generate unique ID for this instance
  const uniqueId = `file-input-${bucket}-${path}-${Math.random().toString(36).substring(2)}`;

  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          resolve(new File([blob!], file.name, { type: 'image/webp' }));
        }, 'image/webp', 0.8);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Solo se permiten archivos de imagen",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    
    try {
      // Resize image
      const resizedFile = await resizeImage(file, maxWidth, maxHeight);
      
      // Create unique filename
      const fileExt = 'webp';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = path ? `${path}/${fileName}` : fileName;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, resizedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      setPreview(publicUrl);
      onUpload(publicUrl);
      
      toast({
        title: "Éxito",
        description: "Imagen subida correctamente"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al subir la imagen",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  }, [bucket, path, maxWidth, maxHeight, onUpload, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const clearImage = () => {
    setPreview(null);
    onUpload('');
  };

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div
          className="relative border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          {preview ? (
            <div className="space-y-4">
              <div className="relative inline-block">
                <img 
                  src={preview} 
                  alt="Preview" 
                  className="max-w-full max-h-48 rounded-lg"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute -top-2 -right-2"
                  onClick={clearImage}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(uniqueId)?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Cambiar imagen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto w-12 h-12 text-muted-foreground">
                <ImageIcon className="w-full h-full" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  Arrastra una imagen aquí o haz clic para seleccionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  JPG, PNG o WebP (máx. {maxWidth}x{maxHeight}px)
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById(uniqueId)?.click()}
                disabled={uploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
              </Button>
            </div>
          )}

          <input
            id={uniqueId}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={uploading}
          />
        </div>
      </CardContent>
    </Card>
  );
}