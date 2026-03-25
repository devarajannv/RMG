import { useCallback, useEffect, useState } from 'react';

import { IntegrationSettings } from '@/components/settings';
import type { Integration, Webhook } from '@/components/settings';

export default function AdminIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationWebhooks, setIntegrationWebhooks] = useState<Webhook[]>([]);

  useEffect(() => {
    const savedIntegrations = sessionStorage.getItem('integrationSettings');
    if (savedIntegrations) {
      setIntegrations(JSON.parse(savedIntegrations));
    }

    const savedWebhooks = sessionStorage.getItem('integrationWebhooks');
    if (savedWebhooks) {
      setIntegrationWebhooks(JSON.parse(savedWebhooks));
    }
  }, []);

  const handleConnectIntegration = useCallback((type: string) => {
    const newIntegration: Integration = {
      id: crypto.randomUUID(),
      name: type,
      type: 'oauth',
      provider: type,
      status: 'connected',
      lastSync: new Date().toISOString(),
    };

    setIntegrations((prev) => {
      const updated = [...prev, newIntegration];
      sessionStorage.setItem('integrationSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDisconnectIntegration = useCallback((id: string) => {
    setIntegrations((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      sessionStorage.setItem('integrationSettings', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleCreateWebhook = useCallback((webhook: Partial<Webhook>) => {
    const newWebhook: Webhook = {
      id: crypto.randomUUID(),
      name: webhook.name || 'New Webhook',
      url: webhook.url || '',
      events: webhook.events || [],
      isActive: webhook.isActive ?? true,
    };

    setIntegrationWebhooks((prev) => {
      const updated = [...prev, newWebhook];
      sessionStorage.setItem('integrationWebhooks', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleUpdateWebhook = useCallback((id: string, webhook: Partial<Webhook>) => {
    setIntegrationWebhooks((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...webhook } : item));
      sessionStorage.setItem('integrationWebhooks', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleDeleteWebhook = useCallback((id: string) => {
    setIntegrationWebhooks((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      sessionStorage.setItem('integrationWebhooks', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleTestWebhook = useCallback(async () => true, []);

  return (
    <IntegrationSettings
      integrations={integrations}
      webhooks={integrationWebhooks}
      onConnectIntegration={handleConnectIntegration}
      onDisconnectIntegration={handleDisconnectIntegration}
      onCreateWebhook={handleCreateWebhook}
      onUpdateWebhook={handleUpdateWebhook}
      onDeleteWebhook={handleDeleteWebhook}
      onTestWebhook={handleTestWebhook}
    />
  );
}
