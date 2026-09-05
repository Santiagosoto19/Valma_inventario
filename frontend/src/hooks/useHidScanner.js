import { useEffect, useRef } from 'react';
import {
  isCompleteBarcode,
  isIgnorableScanModifier,
  isScanTerminator,
  looksLikeBarcode,
  normalizeScanPayload,
  scanKeyToChar,
} from '../utils/barcode';

const RESET_MS = 1200;
const AUTO_SUBMIT_MS = 280;
const FAST_GAP_MS = 250;

export function useHidScanner(onScan, enabled = true, onDebug) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const onDebugRef = useRef(onDebug);
  onDebugRef.current = onDebug;

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastAt = 0;
    let keyCount = 0;
    let autoTimer = null;

    function debug(extra = {}) {
      onDebugRef.current?.({
        buffer,
        keyCount,
        ...extra,
      });
    }

    function clearAuto() {
      if (autoTimer) {
        clearTimeout(autoTimer);
        autoTimer = null;
      }
    }

    function reset() {
      buffer = '';
      clearAuto();
      debug({ lastKey: '', lastCode: '' });
    }

    function emit(code) {
      const trimmed = normalizeScanPayload(code);
      reset();
      if (!looksLikeBarcode(trimmed)) return;
      onScanRef.current(trimmed);
    }

    function appendChar(char, event) {
      const now = performance.now();
      const gap = lastAt ? now - lastAt : 0;
      if (buffer && gap > RESET_MS) buffer = '';
      buffer += char;
      lastAt = now;
      debug({
        lastKey: event?.key || char,
        lastCode: event?.code || '',
      });

      if (isCompleteBarcode(buffer)) {
        clearAuto();
        autoTimer = setTimeout(() => {
          if (isCompleteBarcode(buffer)) emit(buffer);
        }, AUTO_SUBMIT_MS);
      }
    }

    function stealFromField(event) {
      const target = event.target;
      const isScanField =
        target?.dataset?.posScan === 'true' || target?.dataset?.barcodeScan === 'true';
      const inField = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      const fast = lastAt && performance.now() - lastAt < FAST_GAP_MS;
      if (buffer.length >= 3 && (fast || looksLikeBarcode(buffer))) {
        event.preventDefault();
        if (!isScanField && inField) event.stopPropagation();
        return true;
      }
      return false;
    }

    function onKeyDown(event) {
      keyCount += 1;
      debug({ lastKey: event.key, lastCode: event.code || '' });

      if (isScanTerminator(event)) {
        const code = normalizeScanPayload(buffer);
        if (looksLikeBarcode(code)) {
          event.preventDefault();
          event.stopPropagation();
          emit(code);
          return;
        }
        const fieldValue = normalizeScanPayload(event.target?.value);
        if (looksLikeBarcode(fieldValue)) {
          event.preventDefault();
          event.stopPropagation();
          emit(fieldValue);
          return;
        }
        reset();
        return;
      }

      const char = scanKeyToChar(event);
      if (!char) {
        if (!isIgnorableScanModifier(event) && !buffer) reset();
        return;
      }

      stealFromField(event);
      appendChar(char, event);
      stealFromField(event);
    }

    function onPaste(event) {
      const text = normalizeScanPayload(event.clipboardData?.getData('text'));
      if (!looksLikeBarcode(text)) return;
      event.preventDefault();
      emit(text);
    }

    function onBeforeInput(event) {
      const data = normalizeScanPayload(event.data);
      if (looksLikeBarcode(data)) {
        event.preventDefault();
        emit(data);
      }
    }

    function onInput(event) {
      const target = event.target;
      if (target?.dataset?.posScan !== 'true' && target?.dataset?.barcodeScan !== 'true') return;
      const value = normalizeScanPayload(target.value);
      if (!isCompleteBarcode(value)) return;
      clearAuto();
      autoTimer = setTimeout(() => emit(value), AUTO_SUBMIT_MS);
    }

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('paste', onPaste, true);
    window.addEventListener('beforeinput', onBeforeInput, true);
    window.addEventListener('input', onInput, true);
    debug({ lastKey: '', lastCode: '' });

    return () => {
      clearAuto();
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('paste', onPaste, true);
      window.removeEventListener('beforeinput', onBeforeInput, true);
      window.removeEventListener('input', onInput, true);
    };
  }, [enabled]);
}
