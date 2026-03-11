"use client";

import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, RefreshCw, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type Message = {
    id: string;
    type: "me" | "other"; // me: KR speaking, other: JP speaking
    original: string;
    translated: string;
    timestamp: number;
};

export default function InterpreterView() {
    const [isRealtime, setIsRealtime] = useState(false);
    const [speaker, setSpeaker] = useState<"me" | "other">("me"); // me=KR, other=JP
    const [history, setHistory] = useState<Message[]>([]);
    const [currentTranslation, setCurrentTranslation] = useState("");

    // 한국어 인식 훅
    const krRecognition = useSpeechRecognition("ko-KR");
    // 일본어 인식 훅
    const jpRecognition = useSpeechRecognition("ja-JP");

    const activeRecognition = speaker === "me" ? krRecognition : jpRecognition;

    const scrollRef = useRef<HTMLDivElement>(null);

    // 자동 스크롤
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [history, activeRecognition.transcript]);

    // 마이크 버튼 리셋 기능: 마이크 다시 누르면 이전 내용 삭제
    const handleMicToggle = () => {
        if (activeRecognition.isListening) {
            activeRecognition.stopListening();
        } else {
            setHistory([]); // 이전 기록 삭제
            setCurrentTranslation("");
            activeRecognition.startListening();
        }
    };

    // 번역 수행 함수
    const translateText = async (text: string) => {
        if (!text) return "";
        try {
            const response = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: text,
                    sourceLang: speaker === "me" ? "ko" : "ja",
                    targetLang: speaker === "me" ? "ja" : "ko",
                }),
            });
            const data = await response.json();
            setCurrentTranslation(data.translatedText);
            return data.translatedText;
        } catch (err) {
            console.error("번역 실패", err);
            return "";
        }
    };

    // 음성 합성 (TTS) 함수
    const speakJapanese = (text: string) => {
        if (typeof window !== "undefined" && window.speechSynthesis) {
            // 기존에 말하고 있다면 중지
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "ja-JP"; // 일본어 설정
            utterance.rate = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    // 실시간 번역 로직 (인식 중인 텍스트가 바뀔 때마다 호출)
    useEffect(() => {
        if (activeRecognition.transcript && (isRealtime || !activeRecognition.isListening)) {
            // 실시간 모드가 아닐 경우(녹음 종료 시) 지연 없이 즉시 번역
            if (!activeRecognition.isListening) {
                translateText(activeRecognition.transcript).then(translated => {
                    // 한국어 -> 일본어 번역 시에만 음성 출력
                    if (speaker === "me" && translated) {
                        speakJapanese(translated);
                    }
                });
            } else if (isRealtime) {
                // 실시간 모드일 경우에는 API 과부하 방지를 위해 디바운싱 유지
                const timer = setTimeout(() => translateText(activeRecognition.transcript), 300);
                return () => clearTimeout(timer);
            }
        }
    }, [activeRecognition.transcript, isRealtime, activeRecognition.isListening, speaker]);

    // 음성 인식이 종료되었을 때 히스토리에 최종 결과 저장
    useEffect(() => {
        if (!activeRecognition.isListening && activeRecognition.transcript) {
            const finishTranslation = async () => {
                // 이미 위 useEffect에서 번역을 수행하고 상태를 업데이트하므로, 
                // 여기서는 상태값(currentTranslation)을 사용하여 히스토리만 생성
                const finalTranslation = await translateText(activeRecognition.transcript);

                const newMessage: Message = {
                    id: Date.now().toString(),
                    type: speaker,
                    original: activeRecognition.transcript,
                    translated: finalTranslation,
                    timestamp: Date.now(),
                };
                setHistory((prev) => [...prev, newMessage]);
            };
            finishTranslation();
        }
    }, [activeRecognition.isListening, activeRecognition.transcript, speaker]);

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white font-sans overflow-hidden">
            {/* 윗칸: 한국어 영역 */}
            <div className="flex-1 flex flex-col border-b border-slate-700 p-6 overflow-y-auto" ref={scrollRef}>
                <div className="flex items-center gap-2 mb-4 opacity-50">
                    <span className="text-xs font-bold tracking-widest uppercase">한국어 (Korean)</span>
                </div>

                <div className="flex flex-col gap-4">
                    {history.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                            {msg.type === "me" ? (
                                <p className="text-xl font-medium text-white">{msg.original}</p>
                            ) : (
                                <p className="text-xl font-medium text-yellow-300">{msg.translated}</p>
                            )}
                        </div>
                    ))}

                    {/* 실시간 표시 */}
                    {activeRecognition.isListening && (
                        <div className="flex flex-col animate-pulse">
                            {speaker === "me" ? (
                                <p className="text-2xl font-bold text-white leading-tight">
                                    {activeRecognition.transcript || "듣고 있습니다..."}
                                </p>
                            ) : (
                                <p className="text-2xl font-bold text-yellow-300 leading-tight">
                                    {currentTranslation}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 아래칸: 일본어 영역 */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto bg-slate-800/50">
                <div className="flex items-center gap-2 mb-4 opacity-50">
                    <span className="text-xs font-bold tracking-widest uppercase">日本語 (Japanese)</span>
                </div>

                <div className="flex flex-col gap-4">
                    {history.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                            {msg.type === "other" ? (
                                <p className="text-xl font-medium text-white">{msg.original}</p>
                            ) : (
                                <p className="text-xl font-medium text-yellow-300">{msg.translated}</p>
                            )}
                        </div>
                    ))}

                    {/* 실시간 표시 */}
                    {activeRecognition.isListening && (
                        <div className="flex flex-col animate-pulse">
                            {speaker === "other" ? (
                                <p className="text-2xl font-bold text-white leading-tight">
                                    {activeRecognition.transcript || "聞いています..."}
                                </p>
                            ) : (
                                <p className="text-2xl font-bold text-yellow-300 leading-tight">
                                    {currentTranslation}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 컨트롤 영역 */}
            <div className="bg-slate-900 border-t border-slate-700 p-6 pb-10 flex flex-col items-center gap-6">
                <div className="flex justify-between w-full max-w-xs items-center">
                    {/* 실시간 통역 버튼 */}
                    <button
                        onClick={() => setIsRealtime(!isRealtime)}
                        className={cn(
                            "flex flex-col items-center gap-1 transition-colors",
                            isRealtime ? "text-cyan-400" : "text-slate-500"
                        )}
                    >
                        <div className={cn(
                            "p-3 rounded-full border-2",
                            isRealtime ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700"
                        )}>
                            <RefreshCw className={cn("w-6 h-6", isRealtime && "animate-spin-slow")} />
                        </div>
                        <span className="text-[10px] font-bold">실시간 통역</span>
                    </button>

                    {/* 메인 마이크 버튼 */}
                    <button
                        onClick={handleMicToggle}
                        className={cn(
                            "relative p-6 rounded-full transition-all duration-300 transform active:scale-90",
                            activeRecognition.isListening
                                ? "bg-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]"
                                : "bg-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                        )}
                    >
                        {activeRecognition.isListening ? (
                            <MicOff className="w-8 h-8 text-white" />
                        ) : (
                            <Mic className="w-8 h-8 text-white" />
                        )}

                        {activeRecognition.isListening && (
                            <motion.div
                                initial={{ scale: 1, opacity: 0.5 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ repeat: Infinity, duration: 1.5 }}
                                className="absolute inset-0 rounded-full bg-red-500"
                            />
                        )}
                    </button>

                    {/* 화자 전환 버튼 */}
                    <button
                        onClick={() => {
                            if (activeRecognition.isListening) activeRecognition.stopListening();
                            setSpeaker(speaker === "me" ? "other" : "me");
                        }}
                        className="flex flex-col items-center gap-1 text-slate-400 active:text-white transition-colors"
                    >
                        <div className="p-3 rounded-full border-2 border-slate-700">
                            <Languages className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-bold">
                            {speaker === "me" ? "내가 말하기" : "상대가 말하기"}
                        </span>
                    </button>
                </div>

                {/* 현재 상태 표시 */}
                <div className="text-xs text-slate-500 font-medium">
                    {speaker === "me" ? "한국어로 말씀하세요" : "日本語で話してください"}
                </div>
            </div>
        </div>
    );
}
