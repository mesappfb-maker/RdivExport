// --- RdivExport - Voice Search Hook ----------------------------------------
// Recherche vocale via Web Speech API (SpeechRecognition).

import { useState, useCallback, useRef } from 'react'

// --- Types ------------------------------------------------------------------

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionConstructor = {
  new (): SpeechRecognitionInstance
}

interface UseVoiceSearchReturn {
  isListening: boolean
  transcript: string
  error: string | null
  startListening: (language?: string) => void
  stopListening: () => void
  isSupported: boolean
}

// --- Browser support detection ----------------------------------------------

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null

  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }

  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

// --- Hook -------------------------------------------------------------------

export function useVoiceSearch(): UseVoiceSearchReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)

  const isSupported = getSpeechRecognition() !== null

  const startListening = useCallback((language: string = 'fr-FR') => {
    const SpeechRecognition = getSpeechRecognition()

    if (!SpeechRecognition) {
      setError('La reconnaissance vocale n\'est pas supportee par ce navigateur')
      return
    }

    // Stop any existing instance first
    if (recognitionRef.current) {
      try { recognitionRef.current.abort() } catch { /* ignore */ }
    }

    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognition()
    recognition.lang = language
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      // Show final + interim results, only final gets committed
      setTranscript(finalTranscript || interimTranscript)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessages: Record<string, string> = {
        'no-speech': 'Aucune parole detectee',
        'audio-capture': 'Microphone non trouve',
        'not-allowed': 'Permission microphone refusee',
        'network': 'Erreur reseau lors de la reconnaissance vocale',
        'aborted': 'Reconnaissance vocale annulee',
        'service-not-available': 'Service de reconnaissance vocale indisponible',
      }

      const message = errorMessages[event.error] ?? `Erreur vocale : ${event.error}`
      setError(message)
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }

    recognitionRef.current = recognition

    try {
      recognition.start()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du demarrage de la reconnaissance vocale'
      setError(message)
      setIsListening(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch { /* ignore */ }
      recognitionRef.current = null
    }
    setIsListening(false)
  }, [])

  return { isListening, transcript, error, startListening, stopListening, isSupported }
}
