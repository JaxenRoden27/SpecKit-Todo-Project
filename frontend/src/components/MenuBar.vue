<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import AuthServices from "../services/authServices.js";
import UserServices from "../services/userServices.js";
import Utils from "../config/utils.js";
import { emailRules } from "../config/validation.js";

const router = useRouter();
const user = ref(Utils.getStore("user"));
const loading = ref(false);
const menuOpen = ref(false);
const editDialog = ref(false);
const editForm = ref(null);
const error = ref("");
const saving = ref(false);

const fName = ref("");
const lName = ref("");
const email = ref("");
const username = ref("");
const password = ref("");
const confirmPassword = ref("");

const requiredRule = (label) => (value) => !!value?.trim() || `${label} is required.`;
const fNameRules = [requiredRule("First name")];
const lNameRules = [requiredRule("Last name")];
const usernameRules = [requiredRule("Username")];
const passwordRules = [
  (value) => !value || value.length >= 8 || "Password must be at least 8 characters.",
];
const confirmPasswordRules = computed(() => [
  (value) => value === password.value || "Passwords do not match.",
]);

const displayName = computed(() => {
  if (!user.value) {
    return "";
  }
  return [user.value.fName, user.value.lName].filter(Boolean).join(" ");
});

const userId = computed(() => user.value?.userId ?? user.value?.id);

function refreshUser() {
  user.value = Utils.getStore("user");
}

function fillFormFromUser() {
  fName.value = user.value?.fName || "";
  lName.value = user.value?.lName || "";
  email.value = user.value?.email || "";
  username.value = user.value?.username || "";
  password.value = "";
  confirmPassword.value = "";
  error.value = "";
}

async function openEdit() {
  fillFormFromUser();
  editDialog.value = true;
  menuOpen.value = false;
  if (userId.value) {
    try {
      const res = await UserServices.getUser(userId.value);
      fName.value = res.data.fName;
      lName.value = res.data.lName;
      email.value = res.data.email;
      username.value = res.data.username;
    } catch {
      // Fall back to session values already in the form.
    }
  }
}

function cancelEdit() {
  editDialog.value = false;
  fillFormFromUser();
}

async function saveProfile() {
  error.value = "";
  const { valid } = await editForm.value.validate();
  if (!valid) {
    return;
  }

  saving.value = true;
  try {
    const payload = {
      fName: fName.value.trim(),
      lName: lName.value.trim(),
      email: email.value.trim(),
      username: username.value.trim(),
    };
    if (password.value) {
      payload.password = password.value;
    }
    const res = await UserServices.updateUser(userId.value, payload);
    const current = Utils.getStore("user") || {};
    Utils.setStore("user", {
      ...current,
      userId: res.data.id,
      fName: res.data.fName,
      lName: res.data.lName,
      email: res.data.email,
      username: res.data.username,
      role: res.data.role,
    });
    window.dispatchEvent(new CustomEvent("user-logged-in"));
    refreshUser();
    editDialog.value = false;
  } catch (err) {
    error.value = err.response?.data?.message || "Unable to update profile.";
  } finally {
    saving.value = false;
  }
}

async function logOut() {
  loading.value = true;
  try {
    await AuthServices.logoutUser();
  } catch {
    // Clear the local session even if the API call fails.
  } finally {
    Utils.removeItem("user");
    window.dispatchEvent(new CustomEvent("user-logged-out"));
    loading.value = false;
    await router.push({ name: "login" });
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
    <v-spacer />
    <v-menu v-model="menuOpen" location="bottom end" :close-on-content-click="false" attach>
      <template #activator="{ props }">
        <v-btn
          icon="mdi-account-circle"
          v-bind="props"
          aria-label="Open profile"
        />
      </template>
      <v-card min-width="280" class="pa-2">
        <v-list>
          <v-list-item>
            <v-list-item-title>{{ displayName }}</v-list-item-title>
            <v-list-item-subtitle>{{ user?.username }}</v-list-item-subtitle>
            <v-list-item-subtitle>{{ user?.email }}</v-list-item-subtitle>
          </v-list-item>
        </v-list>
        <v-card-actions>
          <v-btn color="primary" variant="elevated" class="oc-cta" @click="openEdit">
            Edit Profile
          </v-btn>
          <v-spacer />
          <v-btn
            color="secondary"
            variant="text"
            type="button"
            :loading="loading"
            @click.stop="logOut"
          >
            Log out
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-menu>
  </v-app-bar>

  <v-dialog v-model="editDialog" max-width="520" :scrim="true" attach>
    <v-card>
      <v-card-item>
        <v-card-title>Edit Profile</v-card-title>
      </v-card-item>
      <v-card-text>
        <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
        <v-form ref="editForm" @submit.prevent="saveProfile">
          <v-text-field v-model="fName" label="First name" :rules="fNameRules" class="mb-2" />
          <v-text-field v-model="lName" label="Last name" :rules="lNameRules" class="mb-2" />
          <v-text-field v-model="email" label="Email" :rules="emailRules" class="mb-2" />
          <v-text-field v-model="username" label="Username" :rules="usernameRules" class="mb-2" />
          <v-text-field
            v-model="password"
            label="New password"
            type="password"
            :rules="passwordRules"
            class="mb-2"
          />
          <v-text-field
            v-model="confirmPassword"
            label="Confirm password"
            type="password"
            :rules="confirmPasswordRules"
          />
        </v-form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="text" @click="cancelEdit">Cancel</v-btn>
        <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="saveProfile">
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
