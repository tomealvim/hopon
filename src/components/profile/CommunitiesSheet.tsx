import { useState, useEffect } from "react";
import Sheet from "../ui/Sheet";
import { Button } from "../ui/Button";
import { apiRequest } from "../../services/api";
import { cn } from "../../utils/cn";

type Community = {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
  requiresApproval: boolean;
  memberCount: number;
  myRole: string;
};

type Member = {
  id: string;
  userId: string;
  role: string;
  status: string;
  user: { email: string; profile?: { name?: string; avatarUrl?: string } | null };
};

type Props = {
  open: boolean;
  onClose: () => void;
  initialInviteCode?: string;
};

export default function CommunitiesSheet({ open, onClose, initialInviteCode }: Props) {
  const [view, setView] = useState<"list" | "create" | "join" | "manage">("list");
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  // Create form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(true);
  const [createError, setCreateError] = useState("");
  const [creating, setCreating] = useState(false);

  // Join form
  const [inviteCode, setInviteCode] = useState("");
  const [joinPreview, setJoinPreview] = useState<any>(null);
  const [joinError, setJoinError] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinDone, setJoinDone] = useState(false);

  useEffect(() => {
    if (open) {
      loadCommunities();
      if (initialInviteCode) {
        setInviteCode(initialInviteCode.toUpperCase());
        setView("join");
        setJoinDone(false);
        // auto-preview
        apiRequest<any>(`/communities/preview/${initialInviteCode.toUpperCase()}`)
          .then((data) => setJoinPreview(data))
          .catch(() => setJoinError("Código inválido ou comunidade não encontrada"));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function loadCommunities() {
    setLoading(true);
    try {
      const data = await apiRequest<Community[]>("/communities/mine");
      setCommunities(Array.isArray(data) ? data : []);
    } catch { setCommunities([]); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true); setCreateError("");
    try {
      await apiRequest("/communities", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, requiresApproval }),
      });
      setName(""); setDescription(""); setRequiresApproval(true);
      await loadCommunities();
      setView("list");
    } catch (e: any) {
      setCreateError(e?.message ?? "Erro ao criar comunidade");
    } finally { setCreating(false); }
  }

  async function handlePreviewCode() {
    if (!inviteCode.trim()) return;
    setJoinError("");
    try {
      const data = await apiRequest<any>(`/communities/preview/${inviteCode.trim().toUpperCase()}`);
      setJoinPreview(data);
    } catch { setJoinError("Código inválido ou comunidade não encontrada"); setJoinPreview(null); }
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setJoining(true); setJoinError("");
    try {
      const res = await apiRequest<any>(`/communities/join/${inviteCode.trim().toUpperCase()}`, { method: "POST" });
      setJoinDone(true);
      setJoinPreview(null);
      if (res.status === "APPROVED") await loadCommunities();
    } catch (e: any) {
      setJoinError(e?.message ?? "Erro ao entrar na comunidade");
    } finally { setJoining(false); }
  }

  async function openManage(community: Community) {
    setSelectedCommunity(community);
    setView("manage");
    try {
      const data = await apiRequest<Member[]>(`/communities/${community.id}/members`);
      setMembers(Array.isArray(data) ? data : []);
    } catch { setMembers([]); }
  }

  async function handleApprove(userId: string) {
    if (!selectedCommunity) return;
    await apiRequest(`/communities/${selectedCommunity.id}/members/${userId}/approve`, { method: "PATCH" });
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, status: "APPROVED" } : m));
  }

  async function handleReject(userId: string) {
    if (!selectedCommunity) return;
    await apiRequest(`/communities/${selectedCommunity.id}/members/${userId}/reject`, { method: "PATCH" });
    setMembers((prev) => prev.map((m) => m.userId === userId ? { ...m, status: "REJECTED" } : m));
  }

  async function handleRemove(userId: string) {
    if (!selectedCommunity) return;
    await apiRequest(`/communities/${selectedCommunity.id}/members/${userId}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.userId !== userId));
  }

  async function handleRegenCode() {
    if (!selectedCommunity) return;
    const res = await apiRequest<{ inviteCode: string }>(`/communities/${selectedCommunity.id}/regenerate-code`, { method: "POST" });
    setSelectedCommunity((prev) => prev ? { ...prev, inviteCode: res.inviteCode } : prev);
    setCommunities((prev) => prev.map((c) => c.id === selectedCommunity.id ? { ...c, inviteCode: res.inviteCode } : c));
  }

  function handleClose() {
    setView("list"); setInviteCode(""); setJoinPreview(null); setJoinError(""); setJoinDone(false);
    setName(""); setDescription(""); setCreateError("");
    onClose();
  }

  return (
    <Sheet open={open} onClose={handleClose} title={
      view === "create" ? "Criar comunidade"
      : view === "join" ? "Entrar com código"
      : view === "manage" ? (selectedCommunity?.name ?? "Gerir comunidade")
      : "As minhas comunidades"
    }>
      {/* LIST */}
      {view === "list" && (
        <div className="flex flex-col gap-4 pb-6">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setView("create")}>Criar comunidade</Button>
            <Button variant="outline" className="flex-1" onClick={() => { setView("join"); setJoinDone(false); }}>Entrar com código</Button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">A carregar...</div>
          ) : communities.length === 0 ? (
            <div className="text-center py-10 px-4">
              <p className="text-2xl mb-2">🏘️</p>
              <p className="text-sm font-semibold text-gray-900 mb-1">Sem comunidades ainda</p>
              <p className="text-xs text-gray-500">Cria uma para a tua empresa ou faculdade, ou entra numa com um código de convite.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {communities.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.memberCount} membro{c.memberCount !== 1 ? "s" : ""} · {c.myRole === "OWNER" ? "Owner" : "Membro"}</p>
                  </div>
                  {c.myRole === "OWNER" && (
                    <button type="button" className="text-xs font-semibold text-gray-900 ml-4" onClick={() => openManage(c)}>
                      Gerir
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE */}
      {view === "create" && (
        <div className="flex flex-col gap-4 pb-6">
          <button type="button" className="text-xs text-gray-500 self-start" onClick={() => setView("list")}>← Voltar</button>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Nome da comunidade</label>
            <input className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              placeholder="Ex: Equipa NOS Lisboa, ISCTE 2025..."
              value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Descrição <span className="font-normal text-gray-400 lowercase">(opcional)</span></label>
            <textarea className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-none"
              placeholder="Ex: Carpooling para colaboradores do escritório de Lisboa"
              rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Aprovação manual</p>
              <p className="text-xs text-gray-500">Tu aprovais cada pedido de entrada</p>
            </div>
            <button type="button"
              onClick={() => setRequiresApproval(!requiresApproval)}
              className={cn("w-11 h-6 rounded-full transition-colors relative", requiresApproval ? "bg-gray-900" : "bg-gray-200")}>
              <span className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", requiresApproval ? "translate-x-5" : "translate-x-0.5")} />
            </button>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <Button className="w-full" disabled={!name.trim() || creating} onClick={handleCreate}>
            {creating ? "A criar..." : "Criar comunidade"}
          </Button>
        </div>
      )}

      {/* JOIN */}
      {view === "join" && (
        <div className="flex flex-col gap-4 pb-6">
          <button type="button" className="text-xs text-gray-500 self-start" onClick={() => setView("list")}>← Voltar</button>
          {joinDone ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="text-4xl">🎉</div>
              <p className="text-base font-bold text-gray-900">Pedido enviado!</p>
              <p className="text-sm text-gray-600 text-center max-w-[260px]">O owner da comunidade irá aprovar o teu pedido em breve.</p>
              <Button className="mt-2 w-full" onClick={() => { setView("list"); setJoinDone(false); setInviteCode(""); }}>Fechar</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Código de convite</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm uppercase tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Ex: A3F9C2B1"
                    value={inviteCode}
                    onChange={(e) => { setInviteCode(e.target.value.toUpperCase()); setJoinPreview(null); setJoinError(""); }}
                    maxLength={8}
                  />
                  <Button variant="outline" onClick={handlePreviewCode} disabled={inviteCode.length < 6}>Ver</Button>
                </div>
              </div>
              {joinError && <p className="text-sm text-red-600">{joinError}</p>}
              {joinPreview && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                  <p className="text-sm font-bold text-gray-900">{joinPreview.name}</p>
                  {joinPreview.description && <p className="text-xs text-gray-500 mt-0.5">{joinPreview.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">{joinPreview.memberCount} membro{joinPreview.memberCount !== 1 ? "s" : ""} · Owner: {joinPreview.owner?.profile?.name ?? joinPreview.owner?.email}</p>
                  <p className="text-xs text-gray-400 mt-1">{joinPreview.requiresApproval ? "Requer aprovação do owner" : "Entrada automática"}</p>
                </div>
              )}
              <Button className="w-full" disabled={!inviteCode.trim() || joining} onClick={handleJoin}>
                {joining ? "A entrar..." : "Pedir para entrar"}
              </Button>
            </>
          )}
        </div>
      )}

      {/* MANAGE (owner panel) */}
      {view === "manage" && selectedCommunity && (
        <div className="flex flex-col gap-4 pb-6">
          <button type="button" className="text-xs text-gray-500 self-start" onClick={() => setView("list")}>← Voltar</button>

          {/* Invite link */}
          <div className="bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Link de convite</p>
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2">
              <span className="text-xs text-gray-500 truncate flex-1 font-mono">
                {window.location.origin}/join/{selectedCommunity.inviteCode}
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button"
                className="flex-1 text-xs font-semibold bg-gray-900 text-white px-3 py-2 rounded-lg"
                onClick={() => {
                  const link = `${window.location.origin}/join/${selectedCommunity.inviteCode}`;
                  if (navigator.share) {
                    navigator.share({ title: selectedCommunity.name, text: `Junta-te à comunidade ${selectedCommunity.name} no HopOn`, url: link });
                  } else {
                    navigator.clipboard.writeText(link);
                  }
                }}>
                {navigator.share ? "Partilhar" : "Copiar link"}
              </button>
              <button type="button"
                className="text-xs text-gray-400 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg"
                onClick={handleRegenCode}>
                Novo código
              </button>
            </div>
          </div>

          {/* Members */}
          <div>
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Membros</p>
            {members.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Sem membros ainda</p>
            ) : (
              <div className="flex flex-col gap-2">
                {members.map((m) => {
                  const displayName = m.user.profile?.name ?? m.user.email;
                  return (
                    <div key={m.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold shrink-0">
                        {displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                        <p className="text-xs text-gray-400">{m.role === "OWNER" ? "Owner" : m.status === "PENDING" ? "Pendente" : m.status === "APPROVED" ? "Membro" : "Rejeitado"}</p>
                      </div>
                      {m.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleApprove(m.userId)}
                            className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-full font-semibold">Aprovar</button>
                          <button type="button" onClick={() => handleReject(m.userId)}
                            className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">Rejeitar</button>
                        </div>
                      )}
                      {m.status === "APPROVED" && m.role !== "OWNER" && (
                        <button type="button" onClick={() => handleRemove(m.userId)}
                          className="text-xs text-red-500 font-semibold">Expulsar</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
