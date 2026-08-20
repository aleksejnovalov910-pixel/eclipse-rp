<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  CefEvent,
  RpcEvent,
  type BalanceView,
  type BankTransactionView,
  type FamilyView,
  type InventoryView,
  type JobProgressView,
  type VehicleView,
} from '@eclipse/shared';
import { rpc } from '../core/rpc';
import { toClient } from '../core/bridge';

type Tab = 'bank'|'inventory'|'jobs'|'family'|'garage';
const tab = ref<Tab>('bank');
const balance = ref<BalanceView | null>(null);
const history = ref<BankTransactionView[]>([]);
const inventory = ref<InventoryView | null>(null);
const jobs = ref<JobProgressView[]>([]);
const family = ref<FamilyView | null>(null);
const vehicles = ref<VehicleView[]>([]);
const amount = ref('');
const familyName = ref('');
const busy = ref(false);
const error = ref('');

const load = async (): Promise<void> => {
  const [b,h,i,j,f,v] = await Promise.all([
    rpc<BalanceView>(RpcEvent.EconomyBalance), rpc<BankTransactionView[]>(RpcEvent.EconomyHistory,{limit:30}),
    rpc<InventoryView>(RpcEvent.InventoryGet), rpc<JobProgressView[]>(RpcEvent.JobProgress),
    rpc<FamilyView|null>(RpcEvent.FamilyGet), rpc<VehicleView[]>(RpcEvent.VehicleList),
  ]);
  if(b.ok)balance.value=b.data;if(h.ok)history.value=h.data;if(i.ok)inventory.value=i.data;
  if(j.ok)jobs.value=j.data;if(f.ok)family.value=f.data;if(v.ok)vehicles.value=v.data;
};

const money = (value: string | undefined): string => Number(value ?? 0).toLocaleString('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2});
const bankAction = async (event: string): Promise<void> => {
  if(busy.value)return;busy.value=true;error.value='';
  try{const r=await rpc<BalanceView>(event,{amount:amount.value});if(!r.ok){error.value=r.code;return;}balance.value=r.data;amount.value='';await load();}
  finally{busy.value=false;}
};
const createFamily = async (): Promise<void> => {
  if(busy.value)return;busy.value=true;error.value='';
  try{const r=await rpc<FamilyView>(RpcEvent.FamilyCreate,{name:familyName.value});if(!r.ok){error.value=r.code;return;}family.value=r.data;familyName.value='';}
  finally{busy.value=false;}
};
const close=()=>toClient(CefEvent.OverlayClose);
onMounted(()=>void load());
</script>

<template>
  <div class="tablet-shell e-interactive">
    <section class="tablet">
      <aside class="sidebar">
        <div class="logo">E<span>CLIPSE</span></div>
        <button :class="{active:tab==='bank'}" @click="tab='bank'">Банк</button>
        <button :class="{active:tab==='inventory'}" @click="tab='inventory'">Инвентарь</button>
        <button :class="{active:tab==='jobs'}" @click="tab='jobs'">Работы</button>
        <button :class="{active:tab==='family'}" @click="tab='family'">Семья</button>
        <button :class="{active:tab==='garage'}" @click="tab='garage'">Гараж</button>
        <button class="close" @click="close">Закрыть</button>
      </aside>
      <main class="main">
        <header><div><small>ПЛАНШЕТ</small><h1>{{ {bank:'Финансы',inventory:'Инвентарь',jobs:'Работы',family:'Семья',garage:'Транспорт'}[tab] }}</h1></div><button @click="load">Обновить</button></header>
        <p v-if="error" class="error">{{ error }}</p>

        <template v-if="tab==='bank'">
          <div class="cards"><article><span>Наличные</span><strong>${{ money(balance?.cash) }}</strong></article><article><span>Банк</span><strong>${{ money(balance?.bank) }}</strong></article></div>
          <div class="bank-form"><input v-model="amount" placeholder="Сумма" inputmode="decimal"><button @click="bankAction(RpcEvent.EconomyDeposit)">Внести</button><button @click="bankAction(RpcEvent.EconomyWithdraw)">Снять</button></div>
          <h3>Последние операции</h3><div class="list"><article v-for="tx in history" :key="tx.id"><div><b>{{ tx.description || tx.kind }}</b><small>{{ new Date(tx.createdAt).toLocaleString('ru-RU') }}</small></div><strong>${{ money(tx.amount) }}</strong></article><p v-if="!history.length" class="empty">Операций нет</p></div>
        </template>

        <template v-else-if="tab==='inventory'">
          <div class="inventory-head"><span>Вес {{ inventory?.usedWeight ?? '0' }} / {{ inventory?.capacityWeight ?? '0' }} кг</span><span>{{ inventory?.items.length ?? 0 }} предметов</span></div>
          <div class="items"><article v-for="item in inventory?.items" :key="item.id"><strong>{{ item.name }}</strong><span>{{ item.category }} · слот {{ item.slot+1 }}</span><b>×{{ item.quantity }}</b></article><p v-if="!inventory?.items.length" class="empty">Инвентарь пуст</p></div>
        </template>

        <template v-else-if="tab==='jobs'">
          <div class="jobs"><article v-for="job in jobs" :key="job.jobKey"><div><strong>{{ job.name }}</strong><span>Уровень {{ job.level }} · выполнено {{ job.completed }}</span></div><div class="progress"><i :style="{width:`${Math.min(100,job.experience/job.nextLevelExperience*100)}%`}"/></div><small>{{ job.experience }} / {{ job.nextLevelExperience }} XP</small></article></div>
        </template>

        <template v-else-if="tab==='family'">
          <div v-if="family" class="family-card"><small>ВАША СЕМЬЯ</small><h2>{{ family.name }}</h2><div class="cards"><article><span>Уровень</span><strong>{{ family.level }}</strong></article><article><span>Репутация</span><strong>{{ family.reputation }}</strong></article><article><span>Казна</span><strong>${{ money(family.balance) }}</strong></article></div><p>Ранг: {{ family.rankName }} · участников: {{ family.memberCount }}</p></div>
          <div v-else class="create-family"><h2>Создать семью</h2><p>Создайте основу будущей организации: ранги, казна, контракты и семейный транспорт уже поддерживаются серверной схемой.</p><input v-model="familyName" maxlength="40" placeholder="Название семьи"><button :disabled="busy||!familyName.trim()" @click="createFamily">Создать</button></div>
        </template>

        <template v-else>
          <div class="vehicles"><article v-for="car in vehicles" :key="car.id"><div><strong>{{ car.model }}</strong><span>VIN {{ car.vin }} · {{ car.plate || 'без номера' }}</span></div><div class="vehicle-stats"><span>Топливо {{ car.fuel }}%</span><span>{{ car.mileage }} км</span><span :class="{bad:car.impounded}">{{ car.impounded?'Штрафстоянка':car.locked?'Закрыт':'Открыт' }}</span></div></article><p v-if="!vehicles.length" class="empty">Личного транспорта пока нет</p></div>
        </template>
      </main>
    </section>
  </div>
</template>

<style scoped>
.tablet-shell{position:absolute;inset:0;display:grid;place-items:center;background:rgba(3,5,9,.42);backdrop-filter:blur(6px)}.tablet{width:min(1180px,90vw);height:min(760px,86vh);display:grid;grid-template-columns:210px 1fr;background:rgba(10,12,18,.97);border:1px solid var(--e-border);border-radius:26px;overflow:hidden;box-shadow:var(--e-shadow-lg)}.sidebar{display:flex;flex-direction:column;gap:7px;padding:24px 16px;background:rgba(255,255,255,.025);border-right:1px solid var(--e-border)}.logo{font-size:24px;font-weight:900;margin:2px 8px 28px;color:var(--e-accent)}.logo span{color:var(--e-text-primary)}.sidebar button{height:42px;padding:0 14px;text-align:left;border:0;border-radius:10px;background:transparent;color:var(--e-text-secondary);cursor:pointer}.sidebar button.active{background:var(--e-accent-soft);color:var(--e-text-primary)}.sidebar .close{margin-top:auto;color:#ff8a8a}.main{overflow:auto;padding:28px 32px}.main header{display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}.main header small{color:var(--e-accent);letter-spacing:.15em}.main h1{margin:3px 0;font-size:28px}.main header button,.bank-form button,.create-family button{border:1px solid var(--e-border);border-radius:10px;background:var(--e-surface-2);color:var(--e-text-primary);padding:10px 15px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}.cards article{padding:18px;border:1px solid var(--e-border);border-radius:14px;background:var(--e-surface-1)}.cards span{display:block;color:var(--e-text-muted);font-size:12px}.cards strong{display:block;margin-top:7px;font-size:22px}.bank-form{display:flex;gap:8px;margin-bottom:24px}.bank-form input,.create-family input{flex:1;padding:11px 13px;border:1px solid var(--e-border);border-radius:10px;background:var(--e-surface-1);color:var(--e-text-primary)}.list article,.vehicles article{display:flex;justify-content:space-between;align-items:center;padding:13px 4px;border-bottom:1px solid var(--e-border)}.list article div,.vehicles article>div:first-child{display:flex;flex-direction:column}.list small,.vehicles span,.items span,.jobs span{color:var(--e-text-muted);font-size:11px}.inventory-head{display:flex;justify-content:space-between;margin-bottom:16px;color:var(--e-text-secondary)}.items{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.items article{position:relative;min-height:110px;padding:14px;border:1px solid var(--e-border);border-radius:12px;background:var(--e-surface-1);display:flex;flex-direction:column;justify-content:flex-end}.items b{position:absolute;right:12px;top:10px}.jobs{display:grid;grid-template-columns:1fr 1fr;gap:12px}.jobs article{padding:16px;border:1px solid var(--e-border);border-radius:14px;background:var(--e-surface-1)}.jobs article>div:first-child{display:flex;justify-content:space-between}.progress{height:5px;margin:13px 0 7px;background:var(--e-surface-2);border-radius:9px;overflow:hidden}.progress i{display:block;height:100%;background:var(--e-accent)}.family-card,.create-family{padding:24px;border:1px solid var(--e-border);border-radius:16px;background:var(--e-surface-1)}.family-card h2,.create-family h2{font-size:26px;margin:6px 0 20px}.create-family{max-width:520px}.create-family input{width:100%;box-sizing:border-box;margin:15px 0 10px}.vehicle-stats{display:flex;gap:18px}.bad{color:#ff7777!important}.empty{text-align:center;color:var(--e-text-muted);padding:28px}.error{padding:10px;border-radius:10px;background:rgba(255,80,80,.1);color:#ff8585}
</style>
