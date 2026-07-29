<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { Building2, CalendarDays, KeyRound, ShieldCheck } from "lucide-vue-next";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import AppDrawer from "../../components/common/AppDrawer.vue";
import { toast } from "../../components/ui/toast";
import { api } from "../../api";
import { useAuthStore } from "../../stores/auth";
const router=useRouter(),auth=useAuthStore();
const drawerOpen=ref(false),oldPassword=ref(""),newPassword=ref(""),confirmPassword=ref(""),saving=ref(false);
const avatarText=computed(()=>auth.currentUser?.username?.slice(0,1).toUpperCase()||"?");
const createdAt=computed(()=>auth.currentUser?.createdAt?new Date(auth.currentUser.createdAt).toLocaleString():"—");
const canSubmit=computed(()=>!!oldPassword.value&&newPassword.value.length>=12&&newPassword.value===confirmPassword.value);
function openDrawer(){oldPassword.value="";newPassword.value="";confirmPassword.value="";drawerOpen.value=true;}
async function submit(){if(!canSubmit.value||saving.value)return;saving.value=true;try{await api.patch("/user/profile/password",{oldPassword:oldPassword.value,newPassword:newPassword.value});drawerOpen.value=false;toast({title:"密码已更新",description:"请使用新密码重新登录"});auth.logout();await router.replace({name:"login"});}catch{toast({title:"未能修改密码",description:"请核对原密码后重试",variant:"destructive"});}finally{saving.value=false;}}
</script>
<template>
  <div class="page-shell">
    <header class="page-header"><div><h1 class="page-title">个人设置</h1><p class="page-description">查看个人资料并维护账号安全。</p></div><Button variant="secondary" @click="openDrawer"><KeyRound class="h-4 w-4"/>修改密码</Button></header>
    <div class="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <Card as="section"><div class="flex flex-col gap-5 sm:flex-row sm:items-center"><span class="grid h-16 w-16 place-items-center rounded-2xl bg-blue-100 text-xl font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">{{avatarText}}</span><div><h2 class="text-lg font-semibold">{{auth.currentUser?.username??"—"}}</h2><p class="mt-1 text-sm text-slate-500">{{auth.currentUser?.roles.map((r)=>r.name).join("、")||"成员"}}</p></div></div><div class="mt-7 grid gap-3 sm:grid-cols-2"><div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div class="flex items-center gap-2 text-xs text-slate-500"><Building2 class="h-4 w-4"/>所属部门</div><strong class="mt-2 block text-sm">{{auth.currentUser?.department?.name??"未分配"}}</strong></div><div class="rounded-xl border border-slate-200 p-4 dark:border-slate-700"><div class="flex items-center gap-2 text-xs text-slate-500"><CalendarDays class="h-4 w-4"/>加入时间</div><strong class="mt-2 block text-sm">{{createdAt}}</strong></div></div></Card>
      <Card as="section"><div class="flex items-center gap-3"><span class="avatar"><ShieldCheck class="h-5 w-5"/></span><div><h2 class="font-semibold">账号安全</h2><p class="mt-1 text-xs text-slate-500">保持良好的密码习惯</p></div></div><ul class="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300"><li>• 使用至少 12 位的高强度密码</li><li>• 不要在不同服务中重复使用密码</li><li>• 发现异常时及时更新密码</li></ul></Card>
    </div>
  </div>
  <AppDrawer v-model:open="drawerOpen" title="修改密码" description="验证当前密码后，设置新的登录密码。" :busy="saving">
    <div class="grid gap-5"><div class="field"><label for="old-password">当前密码</label><input id="old-password" v-model="oldPassword" class="app-input" type="password" autocomplete="current-password" placeholder="请输入当前密码"/></div><div class="field"><label for="new-password">新密码</label><input id="new-password" v-model="newPassword" class="app-input" type="password" autocomplete="new-password" placeholder="至少 12 位"/><p class="field-hint">建议使用字母、数字和符号组合。</p></div><div class="field"><label for="confirm-password">确认新密码</label><input id="confirm-password" v-model="confirmPassword" class="app-input" type="password" autocomplete="new-password" placeholder="请再次输入新密码"/><p v-if="confirmPassword&&newPassword!==confirmPassword" class="text-xs text-red-600">两次输入不一致</p></div></div>
    <template #footer><Button variant="secondary" :disabled="saving" @click="drawerOpen=false">取消</Button><Button :loading="saving" :disabled="!canSubmit" @click="submit">确认修改</Button></template>
  </AppDrawer>
</template>
