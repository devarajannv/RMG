import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Edit2, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

import {
  CurrencyFormModal,
  ExchangeRateFormModal,
  type Currency,
  type CurrencyFormData,
  type ExchangeRate,
  type ExchangeRateFormData,
} from './shared';

export default function AdminCurrencyPage() {
  const queryClient = useQueryClient();
  const [currencyModalOpen, setCurrencyModalOpen] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | undefined>();
  const [deletingCurrency, setDeletingCurrency] = useState<Currency | null>(null);
  const [exchangeRateModalOpen, setExchangeRateModalOpen] = useState(false);
  const [editingExchangeRate, setEditingExchangeRate] = useState<ExchangeRate | undefined>();
  const [deletingExchangeRate, setDeletingExchangeRate] = useState<ExchangeRate | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setSaveMessage({ type, text });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const { data: currencies = [] } = useQuery<Currency[]>({
    queryKey: ['currencies'],
    queryFn: async () => {
      const res = await api.get<Currency[]>('/currency/currencies');
      return res as unknown as Currency[];
    },
  });

  const { data: exchangeRates = [] } = useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: async () => {
      const res = await api.get<ExchangeRate[]>('/currency/exchange-rates');
      return res as unknown as ExchangeRate[];
    },
  });

  const seedCurrenciesMutation = useMutation({
    mutationFn: async () => {
      await api.post('/currency/currencies/seed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      showMessage('success', 'Currencies seeded successfully!');
    },
    onError: () => showMessage('error', 'Failed to seed currencies'),
  });

  const createCurrencyMutation = useMutation({
    mutationFn: async (data: CurrencyFormData) => api.post('/currency/currencies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setCurrencyModalOpen(false);
      setEditingCurrency(undefined);
      showMessage('success', 'Currency created successfully!');
    },
    onError: () => showMessage('error', 'Failed to create currency'),
  });

  const updateCurrencyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CurrencyFormData }) => api.put(`/currency/currencies/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setCurrencyModalOpen(false);
      setEditingCurrency(undefined);
      showMessage('success', 'Currency updated successfully!');
    },
    onError: () => showMessage('error', 'Failed to update currency'),
  });

  const deleteCurrencyMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/currency/currencies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      setDeletingCurrency(null);
      showMessage('success', 'Currency deleted successfully!');
    },
    onError: () => showMessage('error', 'Failed to delete currency'),
  });

  const createExchangeRateMutation = useMutation({
    mutationFn: async (data: ExchangeRateFormData) => api.post('/currency/exchange-rates', { ...data, rate: parseFloat(data.rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setExchangeRateModalOpen(false);
      setEditingExchangeRate(undefined);
      showMessage('success', 'Exchange rate created successfully!');
    },
    onError: () => showMessage('error', 'Failed to create exchange rate'),
  });

  const updateExchangeRateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExchangeRateFormData }) => api.put(`/currency/exchange-rates/${id}`, { ...data, rate: parseFloat(data.rate) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setExchangeRateModalOpen(false);
      setEditingExchangeRate(undefined);
      showMessage('success', 'Exchange rate updated successfully!');
    },
    onError: () => showMessage('error', 'Failed to update exchange rate'),
  });

  const deleteExchangeRateMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/currency/exchange-rates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] });
      setDeletingExchangeRate(null);
      showMessage('success', 'Exchange rate deleted successfully!');
    },
    onError: () => showMessage('error', 'Failed to delete exchange rate'),
  });

  return (
    <div className="space-y-6">
      {saveMessage && (
        <div
          className={cn(
            'p-3 rounded-lg border',
            saveMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-200'
              : 'bg-red-50 text-red-800 border-red-200'
          )}
        >
          {saveMessage.text}
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Currency Management
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => seedCurrenciesMutation.mutate()} disabled={seedCurrenciesMutation.isPending}>
              {seedCurrenciesMutation.isPending ? 'Seeding...' : 'Seed Defaults'}
            </Button>
            <Button size="sm" onClick={() => { setEditingCurrency(undefined); setCurrencyModalOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Currency
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {currencies.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No currencies configured</p>
              <p className="text-sm">Click "Seed Defaults" to add standard currencies or add one manually</p>
            </div>
          ) : (
            <div className="space-y-2">
              {currencies.map((currency) => (
                <div
                  key={currency.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    currency.isBase ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currency.symbol}</span>
                    <div>
                      <p className="font-medium">
                        {currency.code} - {currency.name}
                        {currency.isBase && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded">Base</span>}
                      </p>
                      <p className="text-sm text-gray-500">{currency.isActive ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { setEditingCurrency(currency); setCurrencyModalOpen(true); }}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {!currency.isBase && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeletingCurrency(currency)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Exchange Rates</CardTitle>
          <Button size="sm" onClick={() => { setEditingExchangeRate(undefined); setExchangeRateModalOpen(true); }} disabled={currencies.length < 2}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rate
          </Button>
        </CardHeader>
        <CardContent>
          {exchangeRates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No exchange rates configured</p>
              <p className="text-sm">Add currencies first, then configure exchange rates</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium">From</th>
                    <th className="text-left p-3 text-sm font-medium">To</th>
                    <th className="text-right p-3 text-sm font-medium">Rate</th>
                    <th className="text-left p-3 text-sm font-medium">Effective</th>
                    <th className="text-right p-3 text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {exchangeRates.map((rate) => (
                    <tr key={rate.id}>
                      <td className="p-3">{rate.fromCurrency?.code}</td>
                      <td className="p-3">{rate.toCurrency?.code}</td>
                      <td className="p-3 text-right font-mono">{Number(rate.rate).toFixed(4)}</td>
                      <td className="p-3 text-sm text-gray-500">{new Date(rate.effectiveFrom).toLocaleDateString()}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => { setEditingExchangeRate(rate); setExchangeRateModalOpen(true); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => setDeletingExchangeRate(rate)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CurrencyFormModal
        isOpen={currencyModalOpen}
        onClose={() => { setCurrencyModalOpen(false); setEditingCurrency(undefined); }}
        currency={editingCurrency}
        onSave={(data) => {
          if (editingCurrency) {
            updateCurrencyMutation.mutate({ id: editingCurrency.id, data });
          } else {
            createCurrencyMutation.mutate(data);
          }
        }}
        isSaving={createCurrencyMutation.isPending || updateCurrencyMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingCurrency}
        onOpenChange={(open) => !open && setDeletingCurrency(null)}
        onConfirm={() => {
          if (deletingCurrency) {
            deleteCurrencyMutation.mutate(deletingCurrency.id);
          }
        }}
        title="Delete Currency"
        description={`Are you sure you want to delete ${deletingCurrency?.code}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteCurrencyMutation.isPending}
      />

      <ExchangeRateFormModal
        isOpen={exchangeRateModalOpen}
        onClose={() => { setExchangeRateModalOpen(false); setEditingExchangeRate(undefined); }}
        exchangeRate={editingExchangeRate}
        currencies={currencies}
        onSave={(data) => {
          if (editingExchangeRate) {
            updateExchangeRateMutation.mutate({ id: editingExchangeRate.id, data });
          } else {
            createExchangeRateMutation.mutate(data);
          }
        }}
        isSaving={createExchangeRateMutation.isPending || updateExchangeRateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingExchangeRate}
        onOpenChange={(open) => !open && setDeletingExchangeRate(null)}
        onConfirm={() => {
          if (deletingExchangeRate) {
            deleteExchangeRateMutation.mutate(deletingExchangeRate.id);
          }
        }}
        title="Delete Exchange Rate"
        description={`Are you sure you want to delete this exchange rate (${deletingExchangeRate?.fromCurrency?.code} to ${deletingExchangeRate?.toCurrency?.code})? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteExchangeRateMutation.isPending}
      />
    </div>
  );
}
