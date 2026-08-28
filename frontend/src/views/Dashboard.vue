<script setup>
import { computed, onMounted, ref } from "vue";
import ListServices from "../services/listServices.js";

const lists = ref([]);
const loading = ref(false);
const error = ref("");
const addDialog = ref(false);
const renameDialog = ref(false);
const deleteDialog = ref(false);
const nameInput = ref("");
const addForm = ref(null);
const renameForm = ref(null);
const activeList = ref(null);
const saving = ref(false);

const nameRules = [(value) => !!value?.trim() || "List name is required."];
const isEmpty = computed(() => !loading.value && lists.value.length === 0);

async function loadLists() {
  loading.value = true;
  error.value = "";
  try {
    const res = await ListServices.getLists();
    lists.value = res.data;
  } catch (err) {
    error.value = err.response?.data?.message || "Unable to load lists.";
  } finally {
    loading.value = false;
  }
}

function openAdd() {
  nameInput.value = "";
  error.value = "";
  addDialog.value = true;
}

function openRename(list) {
  activeList.value = list;
  nameInput.value = list.name;
  error.value = "";
  renameDialog.value = true;
}

function openDelete(list) {
  activeList.value = list;
  error.value = "";
  deleteDialog.value = true;
}

async function createList() {
  const { valid } = await addForm.value.validate();
  if (!valid) {
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    const res = await ListServices.createList({ name: nameInput.value.trim() });
    lists.value = [...lists.value, res.data].sort((a, b) => a.name.localeCompare(b.name));
    addDialog.value = false;
  } catch (err) {
    error.value = err.response?.data?.message || "Unable to create list.";
  } finally {
    saving.value = false;
  }
}

async function renameList() {
  const { valid } = await renameForm.value.validate();
  if (!valid) {
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    const res = await ListServices.updateList(activeList.value.id, {
      name: nameInput.value.trim(),
    });
    lists.value = lists.value
      .map((list) => (list.id === res.data.id ? res.data : list))
      .sort((a, b) => a.name.localeCompare(b.name));
    renameDialog.value = false;
  } catch (err) {
    error.value = err.response?.data?.message || "Unable to rename list.";
  } finally {
    saving.value = false;
  }
}

async function deleteList() {
  saving.value = true;
  error.value = "";
  try {
    await ListServices.deleteList(activeList.value.id);
    lists.value = lists.value.filter((list) => list.id !== activeList.value.id);
    deleteDialog.value = false;
  } catch (err) {
    error.value = err.response?.data?.message || "Unable to delete list.";
  } finally {
    saving.value = false;
  }
}

onMounted(loadLists);
</script>

<template>
  <v-container class="py-8">
    <v-row align="center" class="mb-4">
      <v-col>
        <h1 class="text-h4">My Lists</h1>
      </v-col>
      <v-col cols="auto">
        <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAdd">+ New List</v-btn>
      </v-col>
    </v-row>

    <v-progress-linear v-if="loading" indeterminate class="mb-4" />
    <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
    <p v-if="isEmpty" class="text-body-1">No lists yet. Create your first list.</p>

    <v-list v-if="lists.length" class="bg-surface rounded-lg">
      <v-list-item v-for="list in lists" :key="list.id">
        <v-list-item-title>{{ list.name }}</v-list-item-title>
        <template #append>
          <v-btn
            icon="mdi-pencil"
            size="small"
            variant="text"
            aria-label="Edit list"
            @click="openRename(list)"
          />
          <v-btn
            icon="mdi-delete"
            size="small"
            variant="text"
            aria-label="Delete list"
            @click="openDelete(list)"
          />
        </template>
      </v-list-item>
    </v-list>

    <v-dialog v-model="addDialog" max-width="480" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>New List</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="addForm" @submit.prevent="createList">
            <v-text-field v-model="nameInput" label="List name" :rules="nameRules" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="addDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="createList">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameDialog" max-width="480" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>Rename List</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="renameForm" @submit.prevent="renameList">
            <v-text-field v-model="nameInput" label="List name" :rules="nameRules" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="renameDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="renameList">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteDialog" max-width="480" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>Delete List</v-card-title>
        </v-card-item>
        <v-card-text>
          Delete {{ activeList?.name }}? This cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="deleteDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="saving" @click="deleteList">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
