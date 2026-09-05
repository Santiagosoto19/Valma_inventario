import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import {
  browserUsbSupported,
  deviceLabel,
  listPermittedScanners,
  requestScannerDevice,
} from '../utils/scannerUsb';

const POLL_MS = 2500;

function isLocalHost() {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function emptyStatus() {
  return {
    connected: null,
    deviceName: '',
    source: 'unknown',
    supported: false,
    checking: true,
  };
}

export function useScannerConnection({ enabled = true, onChange } = {}) {
  const [status, setStatus] = useState(emptyStatus);
  const [pairing, setPairing] = useState(false);
  const lastRef = useRef({ connected: null, deviceName: '' });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const publish = useCallback((next) => {
    setStatus(next);
    const prev = lastRef.current;
    if (prev.connected !== next.connected && next.connected !== null && prev.connected !== null) {
      onChangeRef.current?.({
        connected: next.connected,
        deviceName: next.deviceName,
        previous: prev.connected,
      });
    }
    if (next.connected !== null) {
      lastRef.current = { connected: next.connected, deviceName: next.deviceName };
    }
  }, []);

  const refresh = useCallback(async () => {
    let osStatus = null;
    if (isLocalHost()) {
      try {
        osStatus = await api.scanner.status();
      } catch {
        osStatus = null;
      }
    }

    let browserDevices = [];
    try {
      browserDevices = await listPermittedScanners();
    } catch {
      browserDevices = [];
    }

    if (osStatus?.supported && osStatus.connected !== null) {
      const deviceName = osStatus.devices?.[0]?.name || '';
      publish({
        connected: osStatus.connected,
        deviceName,
        source: 'os',
        supported: true,
        checking: false,
        canPair: browserUsbSupported(),
      });
      return;
    }

    if (browserUsbSupported()) {
      const device = browserDevices[0];
      publish({
        connected: Boolean(device),
        deviceName: device ? deviceLabel(device) : '',
        source: 'browser',
        supported: true,
        checking: false,
        canPair: true,
      });
      return;
    }

    publish({
      connected: null,
      deviceName: '',
      source: osStatus?.source || 'unsupported',
      supported: false,
      checking: false,
      canPair: false,
    });
  }, [publish]);

  const pairScanner = useCallback(async () => {
    setPairing(true);
    try {
      const device = await requestScannerDevice();
      lastRef.current = { connected: false, deviceName: '' };
      publish({
        connected: true,
        deviceName: deviceLabel(device),
        source: 'browser',
        supported: true,
        checking: false,
        canPair: true,
      });
      onChangeRef.current?.({
        connected: true,
        deviceName: deviceLabel(device),
        previous: false,
      });
    } finally {
      setPairing(false);
    }
  }, [publish]);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    lastRef.current = { connected: null, deviceName: '' };

    async function tick() {
      if (cancelled || document.hidden) return;
      await refresh();
    }

    tick();
    const timer = setInterval(tick, POLL_MS);

    function onUsbChange() {
      refresh();
    }
    function onVisible() {
      if (!document.hidden) refresh();
    }

    if (browserUsbSupported()) {
      navigator.usb.addEventListener('connect', onUsbChange);
      navigator.usb.addEventListener('disconnect', onUsbChange);
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      if (browserUsbSupported()) {
        navigator.usb.removeEventListener('connect', onUsbChange);
        navigator.usb.removeEventListener('disconnect', onUsbChange);
      }
    };
  }, [enabled, refresh]);

  return { ...status, pairing, refresh, pairScanner };
}
