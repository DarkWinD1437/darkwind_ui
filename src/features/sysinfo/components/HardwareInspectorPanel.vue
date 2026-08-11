<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import PanelBox from "@/shared/components/PanelBox.vue";
import { formatBytes, formatMemoryBytes } from "@/shared/utils/formatBytes";
import { useSysinfoStore } from "../stores/sysinfo.store";

const { t } = useI18n();
const store = useSysinfoStore();

const cpuBrand = computed(() => store.cpu?.brand || "—");
</script>

<template>
  <PanelBox :title="t('panels.hardware.title')" expandable>
    <div class="hw-line">
      <span>CPU</span><span class="hw-value">{{ cpuBrand }}</span>
    </div>
    <div v-if="store.host" class="hw-line" :title="t('panels.hardware.coresTooltip')">
      <span>{{ t("panels.hardware.cores") }}</span
      ><span>{{ t("panels.hardware.coresValue", { physical: store.host.coresPhysical, logical: store.host.coresLogical }) }}</span>
    </div>
    <div v-if="store.mem" class="hw-line">
      <span>{{ t("panels.hardware.totalRam") }}</span><span>{{ formatMemoryBytes(store.mem.total) }}</span>
    </div>
    <div v-if="store.host" class="hw-line">
      <span>{{ t("panels.hardware.host") }}</span><span class="hw-value">{{ store.host.hostname }}</span>
    </div>
    <div v-if="store.host" class="hw-line">
      <span>{{ t("panels.hardware.os") }}</span
      ><span class="hw-value">{{ store.host.osName }} {{ store.host.osVersion }}</span>
    </div>

    <div v-if="store.disks.length > 0" class="hw-disks-title">{{ t("panels.hardware.disks") }}</div>
    <div v-for="disk in store.disks" :key="disk.mountPoint" class="hw-line">
      <span>{{ disk.mountPoint }}</span>
      <span>{{ formatBytes(disk.total - disk.available) }} / {{ formatBytes(disk.total) }}</span>
    </div>
  </PanelBox>
</template>

<style scoped>
.hw-line {
  display: flex;
  justify-content: space-between;
  gap: 0.5vh;
  margin-bottom: 0.2vh;
  opacity: 0.85;
}
.hw-line > span:first-child {
  opacity: 0.6;
  flex-shrink: 0;
}
.hw-value {
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hw-disks-title {
  margin-top: 0.4vh;
  opacity: 0.6;
  border-top: 0.09vh solid rgba(var(--color_r), var(--color_g), var(--color_b), 0.2);
  padding-top: 0.3vh;
}
</style>
