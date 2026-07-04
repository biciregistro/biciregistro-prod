'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getComponentFilterData, ComponentFilterData } from '@/lib/actions/components';

export function ComponentFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [filterData, setFilterData] = useState<ComponentFilterData>({
    categories: [],
    brands: [],
    models: [],
  });

  const analysisMode = searchParams.get('analysisMode') || 'market';
  const componentCategory = searchParams.get('componentCategory');
  const componentBrand = searchParams.get('componentBrand');
  const componentModel = searchParams.get('componentModel');

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (value === null) {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, value);
        }
      }
      return newSearchParams.toString();
    },
    [searchParams]
  );
  
  useEffect(() => {
    const fetchFilters = async () => {
      const data = await getComponentFilterData({
        category: componentCategory,
        brand: componentBrand,
      });
      setFilterData(data);
    };

    if (analysisMode === 'audit') {
        fetchFilters();
    }
  }, [analysisMode, componentCategory, componentBrand]);

  const handleModeChange = (checked: boolean) => {
    const mode = checked ? 'audit' : 'market';
    startTransition(() => {
        sessionStorage.setItem('scrollPosition', window.scrollY.toString());
        router.push(`${pathname}?${createQueryString({ 
            analysisMode: mode,
            componentCategory: null, 
            componentBrand: null, 
            componentModel: null,
            country: null,
            state: null,
            city: null,
            brand: null,
            modality: null,
            gender: null,
            range: null
        })}`);
    });
  };

  const handleFilterChange = (name: string, value: string) => {
    const params: Record<string, string | null> = { [name]: value || null };
    if (name === 'componentCategory') {
        params.componentBrand = null;
        params.componentModel = null;
    }
    if (name === 'componentBrand') {
        params.componentModel = null;
    }
    startTransition(() => {
        sessionStorage.setItem('scrollPosition', window.scrollY.toString());
        router.push(`${pathname}?${createQueryString(params)}`);
    });
  }

  return (
    <div className="p-4 border rounded-lg bg-card text-card-foreground">
        <div className="flex items-center space-x-4">
            <Label htmlFor="analysis-mode-switch">Modo: {analysisMode === 'market' ? 'Análisis de Mercado' : 'Auditoría de Componentes'}</Label>
            <Switch
                id="analysis-mode-switch"
                checked={analysisMode === 'audit'}
                onCheckedChange={handleModeChange}
                disabled={isPending}
            />
        </div>
        <div className={`mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 ${isPending ? 'opacity-50' : ''}`}>
            <div className={analysisMode === 'audit' ? '' : 'opacity-50 pointer-events-none'}>
                <Label>Categoría</Label>
                <Select onValueChange={(value) => handleFilterChange('componentCategory', value)} disabled={analysisMode !== 'audit' || isPending} value={componentCategory ?? ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                        {filterData.categories.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className={analysisMode === 'audit' ? '' : 'opacity-50 pointer-events-none'}>
                <Label>Marca</Label>
                <Select onValueChange={(value) => handleFilterChange('componentBrand', value)} disabled={analysisMode !== 'audit' || !componentCategory || isPending} value={componentBrand ?? ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                        {filterData.brands.map(brand => (
                            <SelectItem key={brand.value} value={brand.value}>{brand.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className={analysisMode === 'audit' ? '' : 'opacity-50 pointer-events-none'}>
                <Label>Modelo</Label>
                <Select onValueChange={(value) => handleFilterChange('componentModel', value)} disabled={analysisMode !== 'audit' || !componentBrand || isPending} value={componentModel ?? ''}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleccionar modelo" />
                    </SelectTrigger>
                    <SelectContent>
                        {filterData.models.map(model => (
                            <SelectItem key={model.value} value={model.value}>{model.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    </div>
  );
}
