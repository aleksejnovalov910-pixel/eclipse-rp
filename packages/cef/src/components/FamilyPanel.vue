<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  RpcEvent,
  type FamilyInvitationView,
  type FamilyMemberView,
  type FamilyView,
} from '@eclipse/shared';
import { rpc } from '../core/rpc';

const family = ref<FamilyView | null>(null);
const members = ref<FamilyMemberView[]>([]);
const invitation = ref<FamilyInvitationView | null>(null);
const familyName = ref('');
const inviteTarget = ref('');
const treasuryAmount = ref('');
const busy = ref(false);
const error = ref('');
const notice = ref('');

const load = async (): Promise<void> => {
  error.value = '';
  const [familyResult, inviteResult] = await Promise.all([
    rpc<FamilyView | null>(RpcEvent.FamilyGet),
    rpc<FamilyInvitationView | null>(RpcEvent.FamilyInvitation),
  ]);
  if (familyResult.ok) family.value = familyResult.data;
  if (inviteResult.ok) invitation.value = inviteResult.data;

  if (family.value) {
    const memberResult = await rpc<FamilyMemberView[]>(RpcEvent.FamilyMembers);
    if (memberResult.ok) members.value = memberResult.data;
  } else {
    members.value = [];
  }
};

const run = async <T>(operation: () => Promise<{ ok: true; data: T } | { ok: false; code: string }>, success: string): Promise<T | null> => {
  if (busy.value) return null;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = await operation();
    if (!result.ok) {
      error.value = result.code;
      return null;
    }
    notice.value = success;
    return result.data;
  } finally {
    busy.value = false;
  }
};

const createFamily = async (): Promise<void> => {
  const created = await run(() => rpc<FamilyView>(RpcEvent.FamilyCreate, { name: familyName.value }), 'Семья создана');
  if (!created) return;
  familyName.value = '';
  await load();
};

const invite = async (): Promise<void> => {
  const targetCharacterId = Number(inviteTarget.value);
  if (!Number.isInteger(targetCharacterId) || targetCharacterId <= 0) {
    error.value = 'Укажите корректный ID персонажа';
    return;
  }
  const sent = await run(
    () => rpc<FamilyInvitationView>(RpcEvent.FamilyInvite, { targetCharacterId }),
    'Приглашение отправлено на 5 минут',
  );
  if (sent) inviteTarget.value = '';
};

const acceptInvite = async (): Promise<void> => {
  const accepted = await run(() => rpc<FamilyView>(RpcEvent.FamilyAcceptInvite), 'Вы вступили в семью');
  if (!accepted) return;
  await load();
};

const leave = async (): Promise<void> => {
  const result = await run(() => rpc<{ left: true }>(RpcEvent.FamilyLeave), 'Вы вышли из семьи');
  if (!result) return;
  await load();
};

const treasury = async (event: string, success: string): Promise<void> => {
  const result = await run(() => rpc<FamilyView>(event, { amount: treasuryAmount.value }), success);
  if (!result) return;
  treasuryAmount.value = '';
  await load();
};

const money = (value: string): string => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
onMounted(() => void load());
</script>

<template>
  <section class="family-panel">
    <p v-if="error" class="message error">{{ error }}</p>
    <p v-if="notice" class="message success">{{ notice }}</p>

    <div v-if="family" class="family-card">
      <div class="family-head">
        <div><small>ВАША СЕМЬЯ</small><h2>{{ family.name }}</h2><p>{{ family.rankName }} · {{ family.memberCount }} участников</p></div>
        <button :disabled="busy" @click="leave">Покинуть</button>
      </div>

      <div class="stats">
        <article><span>Уровень</span><strong>{{ family.level }}</strong></article>
        <article><span>Репутация</span><strong>{{ family.reputation }}</strong></article>
        <article><span>Казна</span><strong>${{ money(family.balance) }}</strong></article>
      </div>

      <div class="section-grid">
        <article class="box">
          <h3>Казна</h3>
          <p>Взнос списывается с банковского счёта. Вывод доступен только рангу с соответствующим правом.</p>
          <input v-model="treasuryAmount" inputmode="decimal" placeholder="Сумма">
          <div class="actions">
            <button :disabled="busy || !treasuryAmount" @click="treasury(RpcEvent.FamilyTreasuryDeposit, 'Взнос внесён')">Внести</button>
            <button :disabled="busy || !treasuryAmount" @click="treasury(RpcEvent.FamilyTreasuryWithdraw, 'Средства выведены')">Вывести</button>
          </div>
        </article>

        <article class="box">
          <h3>Пригласить игрока</h3>
          <p>Приглашение действует 5 минут и принимается самим игроком.</p>
          <input v-model="inviteTarget" inputmode="numeric" placeholder="ID персонажа">
          <button :disabled="busy || !inviteTarget" @click="invite">Отправить приглашение</button>
        </article>
      </div>

      <div class="members">
        <h3>Участники</h3>
        <article v-for="member in members" :key="member.characterId">
          <div><strong>{{ member.name }}</strong><span>ID {{ member.characterId }} · {{ member.rankName }}</span></div>
          <div class="member-meta"><span>Вклад {{ member.contribution }}</span><small>{{ new Date(member.joinedAt).toLocaleDateString('ru-RU') }}</small></div>
        </article>
      </div>
    </div>

    <div v-else class="empty-state">
      <article v-if="invitation" class="invite-card">
        <small>ПРИГЛАШЕНИЕ</small>
        <h2>{{ invitation.familyName }}</h2>
        <p>Приглашение действительно до {{ new Date(invitation.expiresAt).toLocaleTimeString('ru-RU', {hour:'2-digit',minute:'2-digit'}) }}.</p>
        <button :disabled="busy" @click="acceptInvite">Вступить в семью</button>
      </article>

      <article class="create-card">
        <small>НОВАЯ СЕМЬЯ</small>
        <h2>Создать семью</h2>
        <p>После создания появятся ранги, участники, казна и семейные системы.</p>
        <input v-model="familyName" maxlength="40" placeholder="Название семьи">
        <button :disabled="busy || !familyName.trim()" @click="createFamily">Создать</button>
      </article>
    </div>
  </section>
</template>

<style scoped>
.family-panel{display:grid;gap:14px}.message{padding:10px 12px;border-radius:10px;margin:0}.error{background:rgba(255,80,80,.1);color:#ff8585}.success{background:rgba(80,200,120,.1);color:#7dde9f}.family-card,.invite-card,.create-card{padding:22px;border:1px solid var(--e-border);border-radius:16px;background:var(--e-surface-1)}.family-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start}.family-head small,.invite-card small,.create-card small{color:var(--e-accent);letter-spacing:.13em}.family-head h2,.invite-card h2,.create-card h2{margin:5px 0;font-size:27px}.family-head p,.box p,.invite-card p,.create-card p{color:var(--e-text-muted)}button{border:1px solid var(--e-border);border-radius:10px;background:var(--e-surface-2);color:var(--e-text-primary);padding:10px 14px;cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:20px 0}.stats article{padding:15px;border:1px solid var(--e-border);border-radius:12px;background:rgba(255,255,255,.02)}.stats span{display:block;color:var(--e-text-muted);font-size:11px}.stats strong{display:block;margin-top:5px;font-size:20px}.section-grid,.empty-state{display:grid;grid-template-columns:1fr 1fr;gap:12px}.box{padding:16px;border:1px solid var(--e-border);border-radius:13px;background:rgba(255,255,255,.018)}.box h3,.members h3{margin-top:0}.box input,.create-card input{width:100%;box-sizing:border-box;padding:11px 12px;margin:8px 0;border:1px solid var(--e-border);border-radius:9px;background:var(--e-surface-2);color:var(--e-text-primary)}.actions{display:flex;gap:8px}.members{margin-top:20px}.members article{display:flex;justify-content:space-between;align-items:center;padding:11px 4px;border-bottom:1px solid var(--e-border)}.members article>div{display:flex;flex-direction:column}.members span,.members small{color:var(--e-text-muted);font-size:11px}.member-meta{text-align:right}.invite-card{border-color:var(--e-accent)}
</style>
