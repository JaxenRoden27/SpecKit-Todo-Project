<script setup>
import { computed, onMounted, ref } from "vue";
import ListServices from "../services/listServices.js";
import TodoServices from "../services/todoServices.js";

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

const itemsDialog = ref(false);
const addTodoDialog = ref(false);
const editTodoDialog = ref(false);
const deleteTodoDialog = ref(false);
const todos = ref([]);
const todosLoading = ref(false);
const todoError = ref("");
const todoTitle = ref("");
const addTodoForm = ref(null);
const editTodoForm = ref(null);
const activeTodo = ref(null);
const savingTodo = ref(false);

const nameRules = [(value) => !!value?.trim() || "List name is required."];
const titleRules = [(value) => !!value?.trim() || "Todo title is required."];
const isEmpty = computed(() => !loading.value && lists.value.length === 0);
const todosEmpty = computed(() => !todosLoading.value && todos.value.length === 0);

function sortTodos(items) {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
}

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

async function openItems(list) {
  activeList.value = list;
  todos.value = [];
  todoError.value = "";
  itemsDialog.value = true;
  todosLoading.value = true;
  try {
    const res = await TodoServices.getTodos(list.id);
    todos.value = sortTodos(res.data);
  } catch (err) {
    todoError.value = err.response?.data?.message || "Unable to load todos.";
  } finally {
    todosLoading.value = false;
  }
}

function openAddTodo() {
  todoTitle.value = "";
  todoError.value = "";
  addTodoDialog.value = true;
}

function openEditTodo(todo) {
  activeTodo.value = todo;
  todoTitle.value = todo.title;
  todoError.value = "";
  editTodoDialog.value = true;
}

function openDeleteTodo(todo) {
  activeTodo.value = todo;
  todoError.value = "";
  deleteTodoDialog.value = true;
}

async function createTodo() {
  const { valid } = await addTodoForm.value.validate();
  if (!valid) {
    return;
  }

  savingTodo.value = true;
  todoError.value = "";
  try {
    const res = await TodoServices.createTodo(activeList.value.id, {
      title: todoTitle.value.trim(),
    });
    todos.value = sortTodos([...todos.value, res.data]);
    addTodoDialog.value = false;
  } catch (err) {
    todoError.value = err.response?.data?.message || "Unable to add todo.";
  } finally {
    savingTodo.value = false;
  }
}

async function saveTodo() {
  const { valid } = await editTodoForm.value.validate();
  if (!valid) {
    return;
  }

  savingTodo.value = true;
  todoError.value = "";
  try {
    const res = await TodoServices.updateTodo(activeTodo.value.id, {
      title: todoTitle.value.trim(),
    });
    todos.value = sortTodos(
      todos.value.map((todo) => (todo.id === res.data.id ? res.data : todo))
    );
    editTodoDialog.value = false;
  } catch (err) {
    todoError.value = err.response?.data?.message || "Unable to update todo.";
  } finally {
    savingTodo.value = false;
  }
}

async function toggleTodo(todo, completed) {
  todoError.value = "";
  try {
    const res = await TodoServices.updateTodo(todo.id, { completed });
    todos.value = sortTodos(
      todos.value.map((item) => (item.id === res.data.id ? res.data : item))
    );
  } catch (err) {
    todoError.value = err.response?.data?.message || "Unable to update todo.";
  }
}

async function confirmDeleteTodo() {
  savingTodo.value = true;
  todoError.value = "";
  try {
    await TodoServices.deleteTodo(activeTodo.value.id);
    todos.value = todos.value.filter((todo) => todo.id !== activeTodo.value.id);
    deleteTodoDialog.value = false;
  } catch (err) {
    todoError.value = err.response?.data?.message || "Unable to delete todo.";
  } finally {
    savingTodo.value = false;
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
      <v-list-item v-for="list in lists" :key="list.id" class="list-row">
        <v-list-item-title>{{ list.name }}</v-list-item-title>
        <template #append>
          <v-btn
            icon="mdi-format-list-checks"
            size="small"
            variant="text"
            :aria-label="`View items for ${list.name}`"
            @click="openItems(list)"
          />
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

    <v-dialog v-model="itemsDialog" max-width="640" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>{{ activeList?.name }} — Items</v-card-title>
          <template #append>
            <v-btn color="primary" variant="elevated" class="oc-cta" @click="openAddTodo">+ Add Item</v-btn>
          </template>
        </v-card-item>
        <v-card-text>
          <v-progress-linear v-if="todosLoading" indeterminate class="mb-4" />
          <v-alert v-if="todoError" type="error" class="mb-4">{{ todoError }}</v-alert>
          <p v-if="todosEmpty" class="text-body-1">No todos in this list yet.</p>
          <v-list v-if="todos.length">
            <v-list-item v-for="todo in todos" :key="todo.id" class="todo-row">
              <template #prepend>
                <v-checkbox-btn
                  :model-value="todo.completed"
                  :aria-label="`Toggle ${todo.title}`"
                  @update:model-value="toggleTodo(todo, $event)"
                />
              </template>
              <v-list-item-title :class="{ 'text-decoration-line-through text-medium-emphasis': todo.completed }">
                {{ todo.title }}
              </v-list-item-title>
              <template #append>
                <v-btn
                  icon="mdi-pencil"
                  size="small"
                  variant="text"
                  aria-label="Edit todo"
                  @click="openEditTodo(todo)"
                />
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  aria-label="Delete todo"
                  @click="openDeleteTodo(todo)"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="itemsDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="addTodoDialog" max-width="480" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>Add Item</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="addTodoForm" @submit.prevent="createTodo">
            <v-text-field v-model="todoTitle" label="Todo title" :rules="titleRules" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="addTodoDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="savingTodo" @click="createTodo">
            Add
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editTodoDialog" max-width="480" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>Edit Item</v-card-title>
        </v-card-item>
        <v-card-text>
          <v-form ref="editTodoForm" @submit.prevent="saveTodo">
            <v-text-field v-model="todoTitle" label="Todo title" :rules="titleRules" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="editTodoDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="savingTodo" @click="saveTodo">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="deleteTodoDialog" max-width="480" :scrim="true" attach>
      <v-card>
        <v-card-item>
          <v-card-title>Delete Item</v-card-title>
        </v-card-item>
        <v-card-text>
          Delete {{ activeTodo?.title }}?
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="secondary" variant="text" @click="deleteTodoDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="elevated" class="oc-cta" :loading="savingTodo" @click="confirmDeleteTodo">
            Delete
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>
