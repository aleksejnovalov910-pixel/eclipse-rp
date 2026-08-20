<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { CefEvent, RpcEvent, type PhoneContactView, type PhoneMessageView, type PhoneProfileView } from '@eclipse/shared';
import { rpc } from '../core/rpc';
import { toClient } from '../core/bridge';

const profile = ref<PhoneProfileView | null>(null);
const contacts = ref<PhoneContactView[]>([]);
const messages = ref<PhoneMessageView[]>([]);
const tab = ref<'messages'|'contacts'>('messages');
const target = ref('');
const body = ref('');
const contactName = ref('');
const busy = ref(false);
const error = ref('');

const conversations = computed(() => {
  const map = new Map<string, PhoneMessageView[]>();
  for (const message of [...messages.value].reverse()) {
    const list = map.get(message.otherPhoneNumber) ?? [];
    list.push(message);
    map.set(message.otherPhoneNumber, list);
  }
  return [...map.entries()].reverse();
});

const load = async (): Promise<void> => {
  const [p, c, m] = await Promise.all([
    rpc<PhoneProfileView>(RpcEvent.PhoneProfile),
    rpc<PhoneContactView[]>(RpcEvent.PhoneContacts),
    rpc<PhoneMessageView[]>(RpcEvent.PhoneMessages, { limit: 150 }),
  ]);
  if (p.ok) profile.value = p.data;
  if (c.ok) contacts.value = c.data;
  if (m.ok) messages.value = m.data;
};

const send = async (): Promise<void> => {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await rpc<PhoneMessageView>(RpcEvent.PhoneSendMessage, { phoneNumber: target.value, body: body.value });
    if (!result.ok) { error.value = result.code; return; }
    messages.value.unshift(result.data); body.value = '';
  } finally { busy.value = false; }
};

const saveContact = async (): Promise<void> => {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await rpc<PhoneContactView>(RpcEvent.PhoneContactSave, { phoneNumber: target.value, displayName: contactName.value });
    if (!result.ok) { error.value = result.code; return; }
    await load(); contactName.value = '';
  } finally { busy.value = false; }
};

const contactLabel = (phone: string): string => contacts.value.find((c) => c.phoneNumber === phone)?.displayName ?? phone;
const close = (): void => toClient(CefEvent.OverlayClose);
onMounted(() => void load());
</script>

<template>
  <div class="phone-shell e-interactive">
    <section class="phone">
      <header class="phone__top">
        <div><span class="brand">ECLIPSE</span><strong>{{ profile?.phoneNumber ?? '•••••••' }}</strong></div>
        <button class="icon" @click="close">×</button>
      </header>
      <nav class="tabs">
        <button :class="{active:tab==='messages'}" @click="tab='messages'">Сообщения</button>
        <button :class="{active:tab==='contacts'}" @click="tab='contacts'">Контакты</button>
      </nav>

      <main v-if="tab==='messages'" class="content">
        <div class="compose">
          <input v-model="target" placeholder="Номер телефона" maxlength="10">
          <textarea v-model="body" placeholder="Сообщение" maxlength="500" />
          <button :disabled="busy || !target || !body.trim()" @click="send">Отправить</button>
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="conversations">
          <article v-for="[phone, list] in conversations" :key="phone" class="conversation" @click="target=phone">
            <div class="avatar">{{ contactLabel(phone).slice(0,1).toUpperCase() }}</div>
            <div class="meta"><strong>{{ contactLabel(phone) }}</strong><span>{{ list[list.length-1]?.body }}</span></div>
            <small>{{ list.length }}</small>
          </article>
          <p v-if="!conversations.length" class="empty">Сообщений пока нет</p>
        </div>
      </main>

      <main v-else class="content">
        <div class="compose contact-form">
          <input v-model="target" placeholder="Номер телефона" maxlength="10">
          <input v-model="contactName" placeholder="Имя контакта" maxlength="40">
          <button :disabled="busy || !target || !contactName.trim()" @click="saveContact">Сохранить</button>
        </div>
        <article v-for="contact in contacts" :key="contact.id" class="conversation" @click="target=contact.phoneNumber;tab='messages'">
          <div class="avatar">{{ contact.displayName.slice(0,1).toUpperCase() }}</div>
          <div class="meta"><strong>{{ contact.displayName }}</strong><span>{{ contact.phoneNumber }}</span></div>
        </article>
        <p v-if="!contacts.length" class="empty">Добавьте первый контакт</p>
      </main>
    </section>
  </div>
</template>

<style scoped>
.phone-shell{position:absolute;inset:0;display:flex;align-items:flex-end;justify-content:flex-end;padding:4vh 3vw;pointer-events:none}.phone{pointer-events:auto;width:360px;height:680px;display:flex;flex-direction:column;background:rgba(10,12,18,.97);border:1px solid var(--e-border);border-radius:38px;box-shadow:var(--e-shadow-lg);overflow:hidden}.phone__top{display:flex;justify-content:space-between;align-items:center;padding:24px 22px 14px}.phone__top>div{display:flex;flex-direction:column}.brand{font-size:10px;letter-spacing:.18em;color:var(--e-accent)}.phone__top strong{font-size:13px;margin-top:2px}.icon{width:34px;height:34px;border:0;border-radius:50%;background:var(--e-surface-2);color:var(--e-text-primary);font-size:22px}.tabs{display:grid;grid-template-columns:1fr 1fr;padding:0 16px 12px;gap:8px}.tabs button{height:38px;border:0;border-radius:12px;background:var(--e-surface-1);color:var(--e-text-muted)}.tabs button.active{background:var(--e-accent-soft);color:var(--e-text-primary)}.content{flex:1;overflow:auto;padding:0 16px 20px}.compose{display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:16px;background:var(--e-surface-1);margin-bottom:12px}.compose input,.compose textarea{border:1px solid var(--e-border);border-radius:10px;background:var(--e-surface-0);color:var(--e-text-primary);padding:10px 12px;resize:none}.compose textarea{height:70px}.compose button{height:36px;border:0;border-radius:10px;background:var(--e-accent);color:white;font-weight:700}.compose button:disabled{opacity:.45}.conversation{display:flex;align-items:center;gap:11px;padding:11px 6px;border-bottom:1px solid var(--e-border);cursor:pointer}.avatar{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;background:var(--e-accent-soft);font-weight:700}.meta{min-width:0;flex:1;display:flex;flex-direction:column}.meta strong{font-size:13px}.meta span{font-size:11px;color:var(--e-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.conversation small{color:var(--e-text-muted)}.empty,.error{text-align:center;color:var(--e-text-muted);font-size:12px}.error{color:#ff7474}.contact-form{margin-top:4px}
</style>
