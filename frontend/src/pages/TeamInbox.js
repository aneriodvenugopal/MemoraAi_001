import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MessageSquare, User, Bot, Send, Phone, Brain,
  Users, Clock, Tag, Flame, CheckCircle, ChevronRight, Search,
  Edit3, X, Save, Loader2
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function TeamInbox() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [customerMemory, setCustomerMemory] = useState(null);
  const [stats, setStats] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [correctingMsg, setCorrectingMsg] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const fetchConversations = useCallback(async () => {
    try {
      const [convos, st] = await Promise.all([
        axios.get(`${API}/memoraai/inbox/conversations`, { headers }),
        axios.get(`${API}/memoraai/inbox/stats`, { headers }),
      ]);
      setConversations(convos.data.conversations || []);
      setStats(st.data);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  const loadMessages = async (convo) => {
    setSelectedConvo(convo);
    try {
      const res = await axios.get(`${API}/memoraai/inbox/conversations/${convo.id}/messages`, { headers });
      setMessages(res.data.messages || []);
      setCustomerMemory(res.data.customer_memory);
    } catch (e) { console.error(e); }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedConvo) return;
    setSending(true);
    try {
      await axios.post(`${API}/memoraai/inbox/conversations/${selectedConvo.id}/send`, { message: replyText }, { headers });
      setReplyText("");
      await loadMessages(selectedConvo);
    } catch (e) { console.error(e); }
    setSending(false);
  };

  const handover = async (convoId) => {
    try {
      await axios.post(`${API}/memoraai/inbox/conversations/${convoId}/handover`, {}, { headers });
      await fetchConversations();
      if (selectedConvo?.id === convoId) await loadMessages({ ...selectedConvo, mode: "human" });
    } catch (e) { console.error(e); }
  };

  const resumeAI = async (convoId) => {
    try {
      await axios.post(`${API}/memoraai/inbox/conversations/${convoId}/resume-ai`, {}, { headers });
      await fetchConversations();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="team-inbox-page">
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} data-testid="back-btn"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Button>
          <h1 className="text-xl font-bold text-gray-900 flex-1">Team Inbox</h1>
          {stats && (
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-700">{stats.total_conversations} Total</Badge>
              <Badge className="bg-green-100 text-green-700">{stats.ai_mode} AI</Badge>
              <Badge className="bg-orange-100 text-orange-700">{stats.human_mode} Human</Badge>
              <Badge className="bg-purple-100 text-purple-700">{stats.messages_today} msgs today</Badge>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-120px)]">
          {/* Conversation List */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" data-testid="convo-list">
            <div className="p-3 border-b"><h3 className="font-semibold text-sm text-gray-700">Conversations ({conversations.length})</h3></div>
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-gray-400"><MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p className="text-sm">No conversations yet</p></div>
              ) : conversations.map(c => (
                <div key={c.id} onClick={() => loadMessages(c)}
                  className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${selectedConvo?.id === c.id ? 'bg-violet-50 border-l-4 border-l-violet-500' : ''}`} data-testid={`convo-${c.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(c.customer_name || c.phone || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium text-gray-900 truncate">{c.customer_name || c.phone}</span>
                        {c.mode === 'human' && <Badge className="bg-orange-100 text-orange-600 text-[8px] px-1">Human</Badge>}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate">{c.last_message || 'No messages'}</p>
                    </div>
                    {c.memory_count > 0 && (
                      <span className="text-[9px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full flex-shrink-0"><Brain className="w-2.5 h-2.5 inline" /> {c.memory_count}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" data-testid="chat-panel">
            {selectedConvo ? (
              <>
                <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-sm">{selectedConvo.customer_name || selectedConvo.phone}</span>
                    <Badge variant="outline" className="text-[9px]">{selectedConvo.mode || 'ai'}</Badge>
                  </div>
                  <div className="flex gap-1">
                    {selectedConvo.mode !== 'human' ? (
                      <Button size="sm" variant="outline" className="text-orange-600 text-xs" onClick={() => handover(selectedConvo.id)} data-testid="handover-btn">
                        <User className="w-3 h-3 mr-1" /> Take Over
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="text-green-600 text-xs" onClick={() => resumeAI(selectedConvo.id)} data-testid="resume-ai-btn">
                        <Bot className="w-3 h-3 mr-1" /> Resume AI
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2" style={{maxHeight: 'calc(100vh - 280px)'}}>
                  {messages.map((m, i) => {
                    // Find previous customer (incoming) message for context of AI reply corrections
                    const prevCustomerMsg = m.direction === 'outgoing' && !m.is_manual
                      ? [...messages].slice(0, i).reverse().find(x => x.direction === 'incoming')
                      : null;
                    return (
                    <div key={i} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : m.direction === 'system' ? 'justify-center' : 'justify-start'}`}>
                      {m.direction === 'system' ? (
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{m.content}</span>
                      ) : (
                        <div className="group max-w-[75%] relative">
                          <div className={`px-3 py-2 rounded-2xl text-sm ${m.direction === 'outgoing' ? 'bg-green-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                            {m.is_manual && <span className="text-[8px] font-bold opacity-70 block mb-0.5">{m.sent_by_name}</span>}
                            {m.content}
                            <div className="text-[8px] opacity-50 text-right mt-0.5">{m.timestamp?.split('T')[1]?.slice(0, 5)}</div>
                          </div>
                          {/* Correct AI button — only on AI (non-manual outgoing) replies */}
                          {m.direction === 'outgoing' && !m.is_manual && (
                            <button
                              onClick={() => setCorrectingMsg({ msg: m, customerMsg: prevCustomerMsg })}
                              className="absolute -top-2 -left-2 bg-amber-500 hover:bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5"
                              data-testid={`correct-ai-btn-${i}`}
                              title="Teach AI the correct response"
                            >
                              <Edit3 className="w-2.5 h-2.5" /> Correct
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
                <div className="p-3 border-t flex gap-2">
                  <Input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type a message..." className="flex-1"
                    onKeyDown={e => e.key === 'Enter' && sendReply()} data-testid="reply-input" />
                  <Button onClick={sendReply} disabled={sending} className="px-4" data-testid="send-btn"><Send className="w-4 h-4" /></Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400"><p className="text-sm">Select a conversation</p></div>
            )}
          </div>

          {/* Customer Memory Sidebar */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col" data-testid="memory-sidebar">
            <div className="p-3 border-b"><h3 className="font-semibold text-sm text-gray-700 flex items-center gap-1"><Brain className="w-4 h-4 text-purple-600" /> Customer Memory</h3></div>
            <div className="flex-1 overflow-y-auto p-3">
              {customerMemory ? (
                <div className="space-y-3">
                  <div className="bg-purple-50 rounded-lg p-3">
                    <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{customerMemory.context}</p>
                  </div>
                  <h4 className="text-xs font-semibold text-gray-600">Recent Memories ({customerMemory.count})</h4>
                  {customerMemory.memories.map((m, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-2 text-[11px]">
                      <Badge variant="outline" className="text-[8px] mb-1">{m.memory_type}</Badge>
                      <p className="text-gray-600">{m.content?.slice(0, 120)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8"><Brain className="w-8 h-8 mx-auto mb-2 text-gray-300" /><p className="text-xs">Select a conversation to see customer memory</p></div>
              )}
            </div>
          </div>
        </div>
      </div>

      {correctingMsg && (
        <CorrectAIModal
          aiMsg={correctingMsg.msg}
          customerMsg={correctingMsg.customerMsg}
          conversationId={selectedConvo?.id}
          onClose={() => setCorrectingMsg(null)}
          onSaved={() => setCorrectingMsg(null)}
          headers={headers}
        />
      )}
    </div>
  );
}

function CorrectAIModal({ aiMsg, customerMsg, conversationId, onClose, onSaved, headers }) {
  const [note, setNote] = useState("");
  const [suggested, setSuggested] = useState("");
  const [category, setCategory] = useState("general");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await axios.post(`${API}/memoraai/corrections`, {
        original_message: customerMsg?.content || "",
        ai_response: aiMsg?.content || "",
        correction_note: note,
        suggested_response: suggested,
        category,
        conversation_id: conversationId,
        message_id: aiMsg?.id,
      }, { headers });
      if (res.status === 200 || res.status === 201) {
        onSaved();
      }
    } catch (err) {
      setError("Failed to save correction");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} data-testid="correct-ai-modal">
      <form onSubmit={submit} onClick={e => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-amber-600" /> Teach AI the Correct Response
          </h2>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700" data-testid="close-correct-modal">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-4 space-y-3">
          {customerMsg && (
            <div>
              <p className="text-[10px] uppercase font-semibold text-gray-500 mb-1">Customer said</p>
              <p className="text-xs text-gray-700 bg-gray-50 rounded-lg px-3 py-2">{customerMsg.content}</p>
            </div>
          )}
          <div>
            <p className="text-[10px] uppercase font-semibold text-red-500 mb-1">AI replied (incorrect)</p>
            <p className="text-xs text-gray-700 bg-red-50 rounded-lg px-3 py-2 line-through decoration-red-300">{aiMsg.content}</p>
          </div>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">What should change? *</span>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows="3" required
              placeholder="E.g., Don't quote price. Instead ask budget first."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-vertical"
              data-testid="correct-note-input" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Preferred reply (optional)</span>
            <textarea value={suggested} onChange={e => setSuggested(e.target.value)} rows="2"
              placeholder="Exact phrasing the AI should use next time"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-vertical"
              data-testid="correct-suggested-input" />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-600 mb-1 block">Category</span>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" data-testid="correct-category-select">
              <option value="general">General</option>
              <option value="pricing">Pricing</option>
              <option value="policy">Policy</option>
              <option value="tone">Tone</option>
              <option value="fact">Fact</option>
              <option value="booking">Booking</option>
              <option value="product">Product</option>
              <option value="hours">Hours</option>
            </select>
          </label>
          {error && <p className="text-xs text-red-600" data-testid="correct-error">{error}</p>}
        </div>
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button type="submit" disabled={saving || !note.trim()}
            className="flex-1 flex items-center justify-center gap-1.5 bg-amber-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-amber-600 disabled:opacity-50"
            data-testid="save-correct-btn">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save & Teach AI
          </button>
        </div>
      </form>
    </div>
  );
}
