<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import { CefEvent, NotifyType } from '@eclipse/shared';
import AuthView from './views/AuthView.vue';
import CharacterSelectView from './views/CharacterSelectView.vue';
import CharacterCreateView from './views/CharacterCreateView.vue';
import PhoneView from './views/PhoneView.vue';
import TabletView from './views/TabletView.vue';
import EToastHost from './components/EToastHost.vue';
import { onClient, toClient, isInGame } from './core/bridge';
import { notify } from './core/notify';

type Screen = 'blank'|'auth'|'characterSelect'|'characterCreate'|'phone'|'tablet';
const screen=ref<Screen>('blank'); const createSlot=ref(0); const selectRef=shallowRef<InstanceType<typeof CharacterSelectView>|null>(null);
onClient(CefEvent.Screen,(payload)=>{const{name}=(payload??{}) as {name?:string};if(name==='auth'||name==='characterSelect'||name==='characterCreate'||name==='blank'||name==='phone'||name==='tablet')screen.value=name;});
onClient(CefEvent.Notify,(payload)=>{const{type,text}=(payload??{}) as {type?:NotifyType;text?:string};if(text)notify(type??NotifyType.Info,text);});
const onAuthenticated=()=>{screen.value='characterSelect';};
const onCreateRequested=(slot:number)=>{createSlot.value=slot;screen.value='characterCreate';};
const onCreated=()=>{screen.value='characterSelect';void selectRef.value?.reload();};
onMounted(()=>{toClient(CefEvent.Ready);if(!isInGame())screen.value='auth';});
</script>
<template>
  <Transition name="screen" mode="out-in">
    <AuthView v-if="screen==='auth'" key="auth" @authenticated="onAuthenticated" />
    <CharacterSelectView v-else-if="screen==='characterSelect'" key="select" ref="selectRef" @create="onCreateRequested" />
    <CharacterCreateView v-else-if="screen==='characterCreate'" key="create" :slot-index="createSlot" @created="onCreated" @cancel="screen='characterSelect'" />
    <PhoneView v-else-if="screen==='phone'" key="phone" />
    <TabletView v-else-if="screen==='tablet'" key="tablet" />
  </Transition>
  <EToastHost />
</template>
<style scoped>.screen-enter-active,.screen-leave-active{transition:opacity var(--e-normal) var(--e-ease)}.screen-enter-from,.screen-leave-to{opacity:0}</style>
