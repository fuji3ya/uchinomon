// RN adapter: AsyncStorage-backed MonsterStore singleton for the app to import.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KV, MonsterStore } from './store';

const kv: KV = {
  get: (k) => AsyncStorage.getItem(k),
  set: (k, v) => AsyncStorage.setItem(k, v),
};

export const monsterStore = new MonsterStore(kv);
