import { useState, useCallback } from 'react';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { transcribeAudio, translateText, SUPPORTED_LANGUAGES, TARGET_LANGUAGES } from './services/gemini';

// Icons as components
const MicIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-14 0m14 0a7 7 0 00-14 0m14 0v1a7 7 0 11-14 0v-1m7 4v4m-4 0h8" />
    </svg>
);

const StopIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
);

const UploadIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const TranslateIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
);

const SparklesIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
);

const ClearIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// Emotion badge colors
const EMOTION_COLORS = {
    happy: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    sad: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    angry: 'bg-red-500/20 text-red-300 border-red-500/30',
    neutral: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
    excited: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    concerned: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const EMOTION_EMOJIS = {
    happy: '😊',
    sad: '😢',
    angry: '😠',
    neutral: '😐',
    excited: '🎉',
    concerned: '😟',
};

function App() {
    const [activeTab, setActiveTab] = useState('voice');
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Text translation state
    const [inputText, setInputText] = useState('');
    const [sourceLanguage, setSourceLanguage] = useState('auto');
    const [targetLanguage, setTargetLanguage] = useState('en');

    // Audio recorder hook
    const {
        isRecording,
        audioBlob,
        audioUrl,
        error: recorderError,
        formattedTime,
        startRecording,
        stopRecording,
        clearRecording
    } = useAudioRecorder();

    // Handle audio file upload
    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/flac'];
        if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
            setError('Please upload an MP3, WAV, WebM, OGG, or FLAC audio file.');
            return;
        }

        setError(null);
        setIsProcessing(true);
        setResult(null);

        try {
            const response = await transcribeAudio(file, targetLanguage);
            setResult(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    }, [targetLanguage]);

    // Handle recorded audio transcription
    const handleTranscribeRecording = useCallback(async () => {
        if (!audioBlob) return;

        setError(null);
        setIsProcessing(true);
        setResult(null);

        try {
            const response = await transcribeAudio(audioBlob, targetLanguage);
            setResult(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    }, [audioBlob, targetLanguage]);

    // Handle text translation
    const handleTranslateText = useCallback(async () => {
        if (!inputText.trim()) {
            setError('Please enter some text to translate.');
            return;
        }

        setError(null);
        setIsProcessing(true);
        setResult(null);

        try {
            const response = await translateText(inputText, sourceLanguage, targetLanguage);
            setResult(response);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsProcessing(false);
        }
    }, [inputText, sourceLanguage, targetLanguage]);

    // Clear results
    const handleClear = () => {
        setResult(null);
        setError(null);
        setInputText('');
        clearRecording();
    };

    return (
        <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <header className="max-w-5xl mx-auto text-center mb-10">
                <div className="inline-flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-primary-500 flex items-center justify-center">
                        <TranslateIcon className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-accent-400 via-primary-400 to-accent-400 bg-clip-text text-transparent">
                        LinguaTranslate
                    </h1>
                </div>
                <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                    AI-powered voice and text translation for local languages.
                    Speak or type in Yoruba, Tagalog, and 20+ languages.
                </p>
            </header>

            {/* Main Container */}
            <main className="max-w-5xl mx-auto">
                {/* Tab Selector */}
                <div className="glass-card p-2 mb-6 inline-flex gap-2 w-full sm:w-auto">
                    <button
                        className={`tab-btn flex-1 sm:flex-none flex items-center justify-center gap-2 ${activeTab === 'voice' ? 'active' : ''}`}
                        onClick={() => setActiveTab('voice')}
                    >
                        <MicIcon className="w-5 h-5" />
                        <span>Voice Translation</span>
                    </button>
                    <button
                        className={`tab-btn flex-1 sm:flex-none flex items-center justify-center gap-2 ${activeTab === 'text' ? 'active' : ''}`}
                        onClick={() => setActiveTab('text')}
                    >
                        <TranslateIcon className="w-5 h-5" />
                        <span>Text Translation</span>
                    </button>
                </div>

                {/* Voice Translation Tab */}
                {activeTab === 'voice' && (
                    <div className="glass-card p-6 sm:p-8 mb-6">
                        <div className="flex flex-col items-center">
                            {/* Target Language Selector */}
                            <div className="mb-6 w-full max-w-xs">
                                <label className="block text-sm text-slate-400 mb-2">Translate to:</label>
                                <select
                                    className="custom-select w-full"
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                >
                                    {TARGET_LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.flag} {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Recording Controls */}
                            <div className="flex flex-col items-center gap-6 mb-6">
                                {/* Mic Button */}
                                <button
                                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isRecording
                                            ? 'bg-red-500 recording-pulse'
                                            : 'bg-gradient-to-br from-accent-500 to-primary-500 hover:scale-105 hover:shadow-lg hover:shadow-accent-500/30'
                                        }`}
                                    onClick={isRecording ? stopRecording : startRecording}
                                    disabled={isProcessing}
                                >
                                    {isRecording ? (
                                        <StopIcon className="w-10 h-10 text-white" />
                                    ) : (
                                        <MicIcon className="w-10 h-10 text-white" />
                                    )}
                                </button>

                                {/* Recording Status */}
                                {isRecording && (
                                    <div className="flex items-center gap-3">
                                        <div className="wave-container">
                                            <div className="wave-bar"></div>
                                            <div className="wave-bar"></div>
                                            <div className="wave-bar"></div>
                                            <div className="wave-bar"></div>
                                            <div className="wave-bar"></div>
                                        </div>
                                        <span className="text-red-400 font-mono">{formattedTime}</span>
                                    </div>
                                )}

                                {!isRecording && (
                                    <p className="text-slate-400 text-sm">
                                        Click to start recording
                                    </p>
                                )}
                            </div>

                            {/* Audio Preview & Process */}
                            {audioUrl && !isRecording && (
                                <div className="w-full max-w-md space-y-4">
                                    <audio
                                        src={audioUrl}
                                        controls
                                        className="w-full rounded-lg"
                                    />
                                    <div className="flex gap-3">
                                        <button
                                            className="glow-btn flex-1 flex items-center justify-center gap-2"
                                            onClick={handleTranscribeRecording}
                                            disabled={isProcessing}
                                        >
                                            <SparklesIcon className="w-5 h-5" />
                                            <span>Transcribe & Translate</span>
                                        </button>
                                        <button
                                            className="px-4 py-2 rounded-xl border border-slate-600 text-slate-400 hover:bg-slate-700/50 transition-colors"
                                            onClick={clearRecording}
                                            disabled={isProcessing}
                                        >
                                            <ClearIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Divider */}
                            <div className="flex items-center gap-4 w-full max-w-md my-6">
                                <div className="flex-1 h-px bg-slate-700"></div>
                                <span className="text-slate-500 text-sm">or upload a file</span>
                                <div className="flex-1 h-px bg-slate-700"></div>
                            </div>

                            {/* File Upload */}
                            <label className="w-full max-w-md cursor-pointer group">
                                <div className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center transition-all duration-300 group-hover:border-accent-500/50 group-hover:bg-accent-500/5">
                                    <UploadIcon className="w-10 h-10 mx-auto mb-3 text-slate-500 group-hover:text-accent-400 transition-colors" />
                                    <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                                        Drop an audio file here or <span className="text-accent-400">browse</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-2">MP3, WAV, WebM, OGG, FLAC (max 20MB)</p>
                                </div>
                                <input
                                    type="file"
                                    accept="audio/*"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={isProcessing}
                                />
                            </label>
                        </div>
                    </div>
                )}

                {/* Text Translation Tab */}
                {activeTab === 'text' && (
                    <div className="glass-card p-6 sm:p-8 mb-6">
                        {/* Language Selectors */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">From:</label>
                                <select
                                    className="custom-select w-full"
                                    value={sourceLanguage}
                                    onChange={(e) => setSourceLanguage(e.target.value)}
                                >
                                    {SUPPORTED_LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.flag} {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-slate-400 mb-2">To:</label>
                                <select
                                    className="custom-select w-full"
                                    value={targetLanguage}
                                    onChange={(e) => setTargetLanguage(e.target.value)}
                                >
                                    {TARGET_LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>
                                            {lang.flag} {lang.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Text Input */}
                        <textarea
                            className="custom-textarea h-40 mb-4"
                            placeholder="Enter text to translate..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            disabled={isProcessing}
                        />

                        {/* Translate Button */}
                        <button
                            className="glow-btn w-full flex items-center justify-center gap-2"
                            onClick={handleTranslateText}
                            disabled={isProcessing || !inputText.trim()}
                        >
                            {isProcessing ? (
                                <>
                                    <div className="loading-dots flex gap-1">
                                        <span className="w-2 h-2 bg-white rounded-full"></span>
                                        <span className="w-2 h-2 bg-white rounded-full"></span>
                                        <span className="w-2 h-2 bg-white rounded-full"></span>
                                    </div>
                                    <span>Translating...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>Translate with AI</span>
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Loading Overlay */}
                {isProcessing && (
                    <div className="glass-card p-8 mb-6 text-center">
                        <div className="inline-flex items-center gap-3">
                            <div className="loading-dots flex gap-1">
                                <span className="w-3 h-3 bg-accent-400 rounded-full"></span>
                                <span className="w-3 h-3 bg-accent-400 rounded-full"></span>
                                <span className="w-3 h-3 bg-accent-400 rounded-full"></span>
                            </div>
                            <span className="text-lg text-slate-300">Processing with Gemini AI...</span>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {(error || recorderError) && (
                    <div className="glass-card p-6 mb-6 border-red-500/30 bg-red-500/5">
                        <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                <ClearIcon className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-red-400 mb-1">Error</h3>
                                <p className="text-slate-400">{error || recorderError}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Results Display */}
                {result && !isProcessing && (
                    <div className="glass-card p-6 sm:p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-accent-400" />
                                Translation Result
                            </h2>
                            <button
                                className="text-slate-400 hover:text-white transition-colors"
                                onClick={handleClear}
                            >
                                <ClearIcon className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Detected Language & Emotion */}
                        <div className="flex flex-wrap gap-3 mb-6">
                            {result.detectedLanguage && (
                                <span className="px-3 py-1.5 rounded-full bg-primary-500/20 text-primary-300 text-sm border border-primary-500/30">
                                    🌐 {result.detectedLanguage}
                                </span>
                            )}
                            {result.sourceLanguage && !result.detectedLanguage && (
                                <span className="px-3 py-1.5 rounded-full bg-primary-500/20 text-primary-300 text-sm border border-primary-500/30">
                                    🌐 {result.sourceLanguage}
                                </span>
                            )}
                            {result.emotion && (
                                <span className={`emotion-badge border ${EMOTION_COLORS[result.emotion.toLowerCase()] || EMOTION_COLORS.neutral}`}>
                                    {EMOTION_EMOJIS[result.emotion.toLowerCase()] || '😐'} {result.emotion}
                                </span>
                            )}
                        </div>

                        {/* Side by Side Text Areas */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Original Text */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2 font-medium">Original</label>
                                <div className="custom-textarea min-h-[150px] whitespace-pre-wrap">
                                    {result.originalText || 'No transcription available'}
                                </div>
                            </div>

                            {/* Translated Text */}
                            <div>
                                <label className="block text-sm text-slate-400 mb-2 font-medium">Translation</label>
                                <div className="custom-textarea min-h-[150px] whitespace-pre-wrap">
                                    {result.translation || 'No translation available'}
                                </div>
                            </div>
                        </div>

                        {/* Footnotes */}
                        {result.footnotes && result.footnotes.length > 0 && (
                            <div className="footnote mt-6">
                                <h4 className="font-semibold text-accent-400 mb-2 flex items-center gap-2">
                                    📝 Cultural Notes & Idiom Explanations
                                </h4>
                                <ul className="list-disc list-inside space-y-1">
                                    {result.footnotes.map((note, index) => (
                                        <li key={index}>{note}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-5xl mx-auto mt-12 text-center text-slate-500 text-sm">
                <p>Powered by Google Gemini 2.5 Flash • Made with ❤️ for local language preservation</p>
            </footer>
        </div>
    );
}

export default App;
