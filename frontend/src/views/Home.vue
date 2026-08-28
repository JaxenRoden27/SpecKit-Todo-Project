<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";

const router = useRouter();
const user = computed(() => Utils.getStore("user"));
const firstName = computed(() => user.value?.fName || "there");
const loading = ref(false);

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
</script>

<template>
  <v-container class="py-10">
    <h1 class="text-h4 mb-4">Welcome, {{ firstName }}</h1>
    <v-btn
      color="primary"
      variant="elevated"
      class="oc-cta"
      :loading="loading"
      @click="signOut"
    >
      Sign out
    </v-btn>
  </v-container>
</template>
