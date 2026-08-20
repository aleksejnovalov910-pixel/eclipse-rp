<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  RpcEvent,
  type PropertyOwnedView,
  type PropertyPurchaseResult,
  type PropertySaleResult,
  type PropertyView,
} from '@eclipse/shared';
import { rpc } from '../core/rpc';

type Mode = 'owned' | 'catalog';
const mode = ref<Mode>('owned');
const owned = ref<PropertyOwnedView[]>([]);
const catalog = ref<PropertyView[]>([]);
const busy = ref(false);
const error = ref('');
const notice = ref('');

const load = async (): Promise<void> => {
  error.value = '';
  const [ownedResult, catalogResult] = await Promise.all([
    rpc<PropertyOwnedView[]>(RpcEvent.PropertyOwned),
    rpc<PropertyView[]>(RpcEvent.PropertyCatalog),
  ]);
  if (ownedResult.ok) owned.value = ownedResult.data;
  if (catalogResult.ok) catalog.value = catalogResult.data;
};

const action = async <T>(event: string, propertyId: string, success: string): Promise<T | null> => {
  if (busy.value) return null;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = await rpc<T>(event, { propertyId });
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

const buy = async (propertyId: string): Promise<void> => {
  const result = await action<PropertyPurchaseResult>(RpcEvent.PropertyBuy, propertyId, 'Недвижимость приобретена');
  if (result) await load();
};

const sell = async (propertyId: string): Promise<void> => {
  const result = await action<PropertySaleResult>(RpcEvent.PropertySell, propertyId, 'Объект продан государству за 70% стоимости');
  if (result) await load();
};

const enter = async (propertyId: string): Promise<void> => {
  await action<{ entered: true }>(RpcEvent.PropertyEnter, propertyId, 'Вы вошли в помещение');
};

const exit = async (propertyId: string): Promise<void> => {
  await action<{ exited: true }>(RpcEvent.PropertyExit, propertyId, 'Вы вышли из помещения');
};

const money = (value: string): string => Number(value).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
const coords = (p: { x: number; y: number }): string => `${p.x.toFixed(1)}, ${p.y.toFixed(1)}`;
onMounted(() => void load());
</script>

<template>
  <section class="property-panel">
    <div class="toolbar">
      <div class="tabs">
        <button :class="{active:mode==='owned'}" @click="mode='owned'">Моя недвижимость</button>
        <button :class="{active:mode==='catalog'}" @click="mode='catalog'">Каталог</button>
      </div>
      <button :disabled="busy" @click="load">Обновить</button>
    </div>

    <p v-if="error" class="message error">{{ error }}</p>
    <p v-if="notice" class="message success">{{ notice }}</p>

    <div v-if="mode==='owned'" class="grid">
      <article v-for="item in owned" :key="item.id" class="property">
        <div class="property-head">
          <div><small>{{ item.kind === 'house' ? 'ДОМ' : 'АПАРТАМЕНТЫ' }}</small><h3>{{ item.name }}</h3></div>
          <strong>${{ money(item.price) }}</strong>
        </div>
        <p>Вход: {{ coords(item.exterior) }} · Dimension {{ item.exterior.dimension }}</p>
        <div class="actions">
          <button :disabled="busy" @click="enter(item.id)">Войти рядом с дверью</button>
          <button :disabled="busy" @click="exit(item.id)">Выйти из интерьера</button>
          <button class="danger" :disabled="busy" @click="sell(item.id)">Продать государству</button>
        </div>
      </article>
      <p v-if="!owned.length" class="empty">У вас пока нет недвижимости.</p>
    </div>

    <div v-else class="grid">
      <article v-for="item in catalog" :key="item.id" class="property" :class="{unavailable:item.owned&&!item.ownedByMe}">
        <div class="property-head">
          <div><small>{{ item.kind === 'house' ? 'ДОМ' : 'АПАРТАМЕНТЫ' }}</small><h3>{{ item.name }}</h3></div>
          <strong>${{ money(item.price) }}</strong>
        </div>
        <p>Координаты: {{ coords(item.exterior) }}</p>
        <div class="property-status">
          <span v-if="item.ownedByMe">Уже принадлежит вам</span>
          <span v-else-if="item.owned">Объект занят</span>
          <button v-else :disabled="busy" @click="buy(item.id)">Купить с банковского счёта</button>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.property-panel{display:grid;gap:14px}.toolbar{display:flex;justify-content:space-between;gap:12px}.tabs{display:flex;gap:7px}button{border:1px solid var(--e-border);border-radius:10px;background:var(--e-surface-2);color:var(--e-text-primary);padding:10px 14px;cursor:pointer}button.active{border-color:var(--e-accent);background:var(--e-accent-soft)}button:disabled{opacity:.45;cursor:not-allowed}.message{padding:10px 12px;border-radius:10px;margin:0}.error{background:rgba(255,80,80,.1);color:#ff8585}.success{background:rgba(80,200,120,.1);color:#7dde9f}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.property{padding:17px;border:1px solid var(--e-border);border-radius:14px;background:var(--e-surface-1)}.property.unavailable{opacity:.62}.property-head{display:flex;justify-content:space-between;gap:16px}.property-head small{color:var(--e-accent);letter-spacing:.12em}.property-head h3{margin:4px 0}.property-head>strong{font-size:18px}.property p{color:var(--e-text-muted);font-size:12px}.actions{display:flex;flex-wrap:wrap;gap:7px}.actions .danger{color:#ff8585}.property-status{min-height:40px;display:flex;align-items:center}.property-status span{color:var(--e-text-muted)}.empty{grid-column:1/-1;text-align:center;color:var(--e-text-muted);padding:30px}
</style>
