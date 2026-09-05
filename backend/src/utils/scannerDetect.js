import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const KNOWN_SCANNERS = [
  { vendorId: '0483', productId: '0011' }, // STMicroelectronics USB Adapter (Valma)
  { vendorId: '05e0', productId: null }, // Symbol
  { vendorId: '0c2e', productId: null }, // Honeywell
  { vendorId: '05f9', productId: null }, // Datalogic
  { vendorId: '0536', productId: null }, // Hand Held Products
  { vendorId: '1504', productId: null }, // CipherLab
  { vendorId: '1eab', productId: null }, // Newland
  { vendorId: '0acd', productId: null }, // ID TECH
  { vendorId: '23d0', productId: null }, // Barcode scanner family
];

const NAME_RE = /barcode|scanner|honeywell|symbol|datalogic|zebra|newland|cipherlab|usb adapter|hidbar|lector|code reader/i;

export function normalizeVidPid(value) {
  return String(value || '')
    .replace(/^0x/i, '')
    .toLowerCase()
    .padStart(4, '0')
    .slice(-4);
}

export function isKnownScannerId(vendorId, productId) {
  const vendor = normalizeVidPid(vendorId);
  const product = normalizeVidPid(productId);
  return KNOWN_SCANNERS.some((item) => (
    item.vendorId === vendor && (!item.productId || item.productId === product)
  ));
}

export function looksLikeScanner(device) {
  if (!device) return false;
  if (isKnownScannerId(device.vendorId, device.productId)) return true;
  const blob = [device.name, device.manufacturer, device.productName].filter(Boolean).join(' ');
  if (NAME_RE.test(blob)) return true;
  return Boolean(device.usbKeyboard);
}

function uniqueDevices(devices) {
  const seen = new Set();
  return devices.filter((device) => {
    const key = `${normalizeVidPid(device.vendorId)}:${normalizeVidPid(device.productId)}:${device.name || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function readText(filePath) {
  try {
    return (await fs.readFile(filePath, 'utf8')).trim();
  } catch {
    return '';
  }
}

async function detectLinux() {
  const devices = [];
  const root = '/sys/bus/usb/devices';
  let entries = [];
  try {
    entries = await fs.readdir(root);
  } catch {
    entries = [];
  }

  await Promise.all(entries.map(async (entry) => {
    const dir = path.join(root, entry);
    const vendorId = await readText(path.join(dir, 'idVendor'));
    if (!vendorId) return;
    const productId = await readText(path.join(dir, 'idProduct'));
    const name = await readText(path.join(dir, 'product'));
    const manufacturer = await readText(path.join(dir, 'manufacturer'));
    devices.push({
      vendorId,
      productId,
      name: name || `${vendorId}:${productId}`,
      manufacturer,
      usbKeyboard: false,
    });
  }));

  let keyboardIds = [];
  try {
    keyboardIds = await fs.readdir('/dev/input/by-id');
  } catch {
    keyboardIds = [];
  }
  const usbKeyboards = keyboardIds.filter((name) => /usb-.*-event-kbd$/i.test(name));
  for (const idName of usbKeyboards) {
    const pretty = idName.replace(/^usb-/, '').replace(/-event-kbd$/, '').replace(/_/g, ' ');
    const prettyLower = pretty.toLowerCase();
    const match = devices.find((device) => {
      const name = String(device.name || '').toLowerCase();
      if (!name) return false;
      return prettyLower.includes(name) || name.includes(prettyLower);
    });
    if (match) {
      match.usbKeyboard = true;
      if (pretty.length > String(match.name || '').length) match.name = pretty;
    } else {
      devices.push({
        vendorId: '0000',
        productId: '0000',
        name: pretty,
        manufacturer: '',
        usbKeyboard: true,
      });
    }
  }

  return uniqueDevices(devices);
}

function parseWindowsInstanceId(instanceId = '') {
  const match = String(instanceId).match(/VID_([0-9A-F]{4})&PID_([0-9A-F]{4})/i);
  if (!match) return { vendorId: '', productId: '' };
  return { vendorId: match[1], productId: match[2] };
}

async function detectWindows() {
  const script = [
    '$ErrorActionPreference = "SilentlyContinue"',
    'Get-PnpDevice -PresentOnly |',
    '  Where-Object {',
    '    $_.InstanceId -match "VID_" -and (',
    '      $_.Class -in @("USB","HIDClass","Keyboard") -or',
    '      $_.FriendlyName -match "Keyboard|Barcode|Scanner|USB Adapter|HID"',
    '    )',
    '  } |',
    '  Select-Object Status, Class, FriendlyName, InstanceId |',
    '  ConvertTo-Json -Compress',
  ].join(' ');

  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', script],
    { timeout: 8000, windowsHide: true }
  );
  const raw = String(stdout || '').trim();
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return uniqueDevices(rows.map((row) => {
    const ids = parseWindowsInstanceId(row.InstanceId);
    const name = row.FriendlyName || '';
    const usb = /^USB\\/i.test(row.InstanceId || '');
    const keyboard = /keyboard/i.test(name) || row.Class === 'Keyboard';
    return {
      vendorId: ids.vendorId,
      productId: ids.productId,
      name,
      manufacturer: '',
      usbKeyboard: usb && keyboard,
    };
  }));
}

export async function detectScannerStatus() {
  if (process.env.VERCEL) {
    return {
      connected: null,
      supported: false,
      source: 'cloud',
      platform: process.platform,
      devices: [],
    };
  }

  const platform = process.platform;
  let devices = [];
  try {
    if (platform === 'win32') devices = await detectWindows();
    else if (platform === 'linux') devices = await detectLinux();
    else devices = [];
  } catch (error) {
    return {
      connected: null,
      supported: false,
      source: 'error',
      platform,
      devices: [],
      error: error.message,
    };
  }

  const matches = devices.filter(looksLikeScanner);
  return {
    connected: matches.length > 0,
    supported: platform === 'win32' || platform === 'linux',
    source: 'os',
    platform,
    devices: matches.map((device) => ({
      name: device.name,
      vendorId: normalizeVidPid(device.vendorId),
      productId: normalizeVidPid(device.productId),
    })),
  };
}
