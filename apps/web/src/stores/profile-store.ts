import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Profile, profilesApi } from '@/lib/api/profiles';
import { getErrorMessage } from '@/lib/api/client';

interface ProfileState {
  profiles: Profile[];
  currentProfile: Profile | null;
  isLoading: boolean;
  error: string | null;
  fetchProfiles: () => Promise<void>;
  setCurrentProfile: (profile: Profile | null) => void;
  createProfile: (data: Parameters<typeof profilesApi.create>[0]) => Promise<Profile>;
  updateProfile: (id: string, data: Parameters<typeof profilesApi.update>[1]) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  triggerIngestion: (id: string) => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profiles: [],
      currentProfile: null,
      isLoading: false,
      error: null,

      fetchProfiles: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await profilesApi.list();
          const profiles = response.profiles;
          const current = get().currentProfile;
          
          // Validate currentProfile still exists in fetched profiles
          // If not, reset it to the first profile (or null if no profiles)
          let validCurrentProfile = current;
          if (current) {
            const profileExists = profiles.some(p => p.id === current.id);
            if (!profileExists) {
              validCurrentProfile = profiles.length > 0 ? profiles[0] : null;
            }
          } else if (profiles.length > 0) {
            validCurrentProfile = profiles[0];
          }
          
          set({ 
            profiles, 
            currentProfile: validCurrentProfile,
            isLoading: false 
          });
        } catch (error: any) {
          set({
            error: getErrorMessage(error) || 'Failed to fetch profiles',
            isLoading: false,
          });
        }
      },

      setCurrentProfile: (profile) => {
        set({ currentProfile: profile });
      },

      createProfile: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profilesApi.create(data);
          set((state) => ({
            profiles: [profile, ...state.profiles],
            currentProfile: profile,
            isLoading: false,
          }));
          return profile;
        } catch (error: any) {
          set({
            error: getErrorMessage(error) || 'Failed to create profile',
            isLoading: false,
          });
          throw error;
        }
      },

      updateProfile: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const profile = await profilesApi.update(id, data);
          set((state) => ({
            profiles: state.profiles.map((p) => (p.id === id ? profile : p)),
            currentProfile: state.currentProfile?.id === id ? profile : state.currentProfile,
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: getErrorMessage(error) || 'Failed to update profile',
            isLoading: false,
          });
          throw error;
        }
      },

      deleteProfile: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await profilesApi.delete(id);
          set((state) => {
            const profiles = state.profiles.filter((p) => p.id !== id);
            return {
              profiles,
              currentProfile:
                state.currentProfile?.id === id
                  ? profiles[0] || null
                  : state.currentProfile,
              isLoading: false,
            };
          });
        } catch (error: any) {
          set({
            error: getErrorMessage(error) || 'Failed to delete profile',
            isLoading: false,
          });
          throw error;
        }
      },

      triggerIngestion: async (id) => {
        try {
          await profilesApi.triggerIngestion(id);
        } catch (error: any) {
          set({
            error: getErrorMessage(error) || 'Failed to trigger ingestion',
          });
          throw error;
        }
      },
    }),
    {
      name: 'profile-storage',
      partialize: (state) => ({ currentProfile: state.currentProfile }),
    }
  )
);
