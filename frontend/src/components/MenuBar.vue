<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const user = ref(Utils.getStore("user"));
const loading = ref(false);

const displayName = computed(() => {
  if (!user.value) {
    return "";
  }
  return [user.value.fName, user.value.lName].filter(Boolean).join(" ");
});

function refreshUser() {
  user.value = Utils.getStore("user");
}

async function signOut() {
  loading.value = true;
  try {
    await AuthServices.logoutUser();
  } catch {
    // Clear the local session even if the API call fails.
  } finally {
    Utils.removeItem("user");
    window.dispatchEvent(new CustomEvent("user-logged-out"));
    loading.value = false;
    router.push({ name: "login" });
  }
}

onMounted(() => {
  window.addEventListener("user-logged-in", refreshUser);
});

onUnmounted(() => {
  window.removeEventListener("user-logged-in", refreshUser);
});
</script>

<template>
  <v-app-bar color="surface" elevation="1">
    <v-app-bar-title>{{ displayName }}</v-app-bar-title>
    <v-spacer />
    <v-btn color="primary" variant="text" class="oc-cta" :loading="loading" @click="signOut">
      Sign out
    </v-btn>
  </v-app-bar>
</template>
