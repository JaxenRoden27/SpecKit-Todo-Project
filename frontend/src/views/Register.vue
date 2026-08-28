<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const router = useRouter();
const form = ref(null);
const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");
const loading = ref(false);

const requiredRule = (label) => (value) => !!value?.trim() || `${label} is required.`;

const usernameRules = [requiredRule("Username")];
const fNameRules = [requiredRule("First name")];
const lNameRules = [requiredRule("Last name")];
const passwordRules = [
  (value) => !!value || "Password is required.",
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = computed(() => [
  (value) => !!value || "Confirm password is required.",
  (value) => value === password.value || "Passwords do not match.",
]);

async function onSubmit() {
  error.value = "";
  const { valid } = await form.value.validate();
  if (!valid) {
    return;
  }

  loading.value = true;
  try {
    const res = await AuthServices.registerUser({
      fName: fName.value.trim(),
      lName: lName.value.trim(),
      email: email.value.trim(),
      username: username.value.trim(),
      password: password.value,
    });
    Utils.setStore("user", res.data);
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    router.push({ name: "home" });
  } catch (err) {
    error.value = err.response?.data?.message || "Unable to create account.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="12" sm="8" md="6" lg="5">
        <v-card class="pa-4" elevation="2">
          <v-card-title class="text-h5">Create account</v-card-title>
          <v-card-text>
            <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
            <v-form ref="form" @submit.prevent="onSubmit">
              <v-text-field v-model="fName" label="First name" name="fName" :rules="fNameRules" class="mb-2" />
              <v-text-field v-model="lName" label="Last name" name="lName" :rules="lNameRules" class="mb-2" />
              <v-text-field v-model="email" label="Email" name="email" :rules="emailRules" class="mb-2" />
              <v-text-field v-model="username" label="Username" name="username" :rules="usernameRules" class="mb-2" />
              <v-text-field
                v-model="password"
                label="Password"
                name="password"
                type="password"
                :rules="passwordRules"
                class="mb-2"
              />
              <v-text-field
                v-model="confirmPassword"
                label="Confirm password"
                name="confirmPassword"
                type="password"
                :rules="confirmPasswordRules"
                class="mb-4"
              />
              <v-btn
                type="submit"
                color="primary"
                variant="elevated"
                class="oc-cta"
                block
                :loading="loading"
              >
                Create account
              </v-btn>
            </v-form>
          </v-card-text>
          <v-card-actions class="px-4 pb-4">
            <router-link :to="{ name: 'login' }">Already have an account? Sign in</router-link>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
