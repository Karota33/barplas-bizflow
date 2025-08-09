import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  variant?: 'default' | 'active' | 'inactive' | 'pending' | 'success' | 'error' | 'warning';
  showIcon?: boolean;
}

export function StatusBadge({ status, variant, showIcon = true }: StatusBadgeProps) {
  const getVariantFromStatus = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    if (['activo', 'active', 'confirmado', 'entregado', 'success'].includes(normalizedStatus)) {
      return 'success';
    }
    if (['inactivo', 'inactive', 'cancelado', 'error'].includes(normalizedStatus)) {
      return 'error';
    }
    if (['pendiente', 'pending', 'revision', 'preparacion'].includes(normalizedStatus)) {
      return 'warning';
    }
    return 'default';
  };

  const finalVariant = variant || getVariantFromStatus(status);

  const getIcon = () => {
    if (!showIcon) return null;
    
    switch (finalVariant) {
      case 'success':
        return <CheckCircle className="w-3 h-3" />;
      case 'error':
        return <XCircle className="w-3 h-3" />;
      case 'warning':
        return <AlertTriangle className="w-3 h-3" />;
      case 'pending':
        return <Clock className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getClassName = () => {
    switch (finalVariant) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border-yellow-200';
      case 'pending':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 border-blue-200';
      default:
        return '';
    }
  };

  return (
    <Badge className={`flex items-center gap-1 ${getClassName()}`}>
      {getIcon()}
      {status}
    </Badge>
  );
}