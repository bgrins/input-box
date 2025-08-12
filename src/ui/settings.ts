export class SettingsManager {
  private currentProfile: string;
  private onProfileChange?: (profile: string) => void;
  private settingsPanel: HTMLElement | null = null;
  private settingsButton: HTMLElement | null = null;
  private profiles = [
    "anna",
    "jessica",
    "john",
    "marie",
    "mina",
    "peter",
    "robert",
    "theo",
    "youssef",
  ];

  constructor() {
    // Load saved profile from localStorage or default to anna
    this.currentProfile = localStorage.getItem("selectedProfile") || "anna";
    this.initializeSettings();
    this.setupGlobalKeyboardShortcuts();
  }

  private setupGlobalKeyboardShortcuts(): void {
    document.addEventListener("keydown", (e) => {
      // Open settings with "?" key
      if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't open if user is typing in an input or editor
        const activeElement = document.activeElement;
        const isTyping =
          activeElement?.tagName === "INPUT" ||
          activeElement?.tagName === "TEXTAREA" ||
          activeElement?.classList.contains("ProseMirror");

        if (!isTyping) {
          e.preventDefault();
          this.showSettings();
        }
      }
    });
  }

  private initializeSettings(): void {
    // Create settings button
    const settingsButton = document.createElement("button");
    settingsButton.className = "settings-button";
    settingsButton.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z"></path>
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
      </svg>
    `;
    settingsButton.title = "Settings (Press ? for shortcut)";
    settingsButton.setAttribute("tabindex", "0");
    settingsButton.setAttribute("aria-label", "Settings");

    // Handle both click and keyboard activation
    settingsButton.addEventListener("click", () => this.toggleSettings());
    settingsButton.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.toggleSettings();
      }
      // Tab to return focus to editor
      else if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const editor = document.querySelector(".ProseMirror") as HTMLElement;
        if (editor) {
          editor.focus();
        }
      }
    });

    // Add to page
    document.body.appendChild(settingsButton);
    this.settingsButton = settingsButton;

    // Create settings panel
    this.createSettingsPanel();
  }

  private createSettingsPanel(): void {
    const dialog = document.createElement("dialog");
    dialog.className = "settings-dialog";

    const modalContent = document.createElement("div");
    modalContent.className = "settings-modal-content";

    const header = document.createElement("div");
    header.className = "settings-header";
    header.innerHTML = `
      <h3>Settings</h3>
      <button class="settings-close">&times;</button>
    `;

    const content = document.createElement("div");
    content.className = "settings-content";

    // Profile selector section
    const profileSection = document.createElement("div");
    profileSection.className = "settings-section";
    profileSection.innerHTML = `
      <label class="settings-label" id="profile-label">User Profile</label>
      <div class="profile-selector" role="radiogroup" aria-labelledby="profile-label">
        ${this.profiles
          .map(
            (profile) => `
          <div class="profile-option ${profile === this.currentProfile ? "active" : ""}" 
               data-profile="${profile}"
               role="radio"
               aria-checked="${profile === this.currentProfile}"
               tabindex="${profile === this.currentProfile ? "0" : "-1"}"
               aria-label="Select ${profile.charAt(0).toUpperCase() + profile.slice(1)}">
            <div class="profile-avatar" aria-hidden="true">${profile[0].toUpperCase()}</div>
            <span class="profile-name">${profile.charAt(0).toUpperCase() + profile.slice(1)}</span>
          </div>
        `,
          )
          .join("")}
      </div>
    `;

    content.appendChild(profileSection);
    modalContent.appendChild(header);
    modalContent.appendChild(content);
    dialog.appendChild(modalContent);

    // Add event listeners
    header.querySelector(".settings-close")?.addEventListener("click", () => {
      this.hideSettings();
    });

    // Profile selection with click
    profileSection.addEventListener("click", (e) => {
      const option = (e.target as HTMLElement).closest(".profile-option");
      if (option) {
        const profile = option.getAttribute("data-profile");
        if (profile && profile !== this.currentProfile) {
          this.selectProfile(profile);
        }
      }
    });

    // Keyboard navigation for profiles
    profileSection.addEventListener("keydown", (e) => {
      const option = (e.target as HTMLElement).closest(
        ".profile-option",
      ) as HTMLElement;
      const allOptions = Array.from(
        profileSection.querySelectorAll(".profile-option"),
      );

      if (!option) return;

      const currentIndex = allOptions.indexOf(option);
      let nextOption: HTMLElement | null = null;

      switch (e.key) {
        case "Enter":
        case " ": {
          e.preventDefault();
          const profile = option.getAttribute("data-profile");
          if (profile && profile !== this.currentProfile) {
            this.selectProfile(profile);
          }
          break;
        }

        case "ArrowRight":
        case "ArrowDown":
          e.preventDefault();
          nextOption = (allOptions[currentIndex + 1] ||
            allOptions[0]) as HTMLElement;
          break;

        case "ArrowLeft":
        case "ArrowUp":
          e.preventDefault();
          nextOption = (allOptions[currentIndex - 1] ||
            allOptions[allOptions.length - 1]) as HTMLElement;
          break;

        case "Home":
          e.preventDefault();
          nextOption = allOptions[0] as HTMLElement;
          break;

        case "End":
          e.preventDefault();
          nextOption = allOptions[allOptions.length - 1] as HTMLElement;
          break;
      }

      if (nextOption) {
        // Update tabindex
        allOptions.forEach((opt) => opt.setAttribute("tabindex", "-1"));
        nextOption.setAttribute("tabindex", "0");
        nextOption.focus();
      }
    });

    // Click outside to close (using dialog's built-in backdrop click)
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (!isInDialog) {
        this.hideSettings();
      }
    });

    // ESC key handling is built into dialog element
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.hideSettings();
    });

    document.body.appendChild(dialog);
    this.settingsPanel = dialog as HTMLElement;
  }

  private toggleSettings(): void {
    if (this.settingsPanel) {
      const dialog = this.settingsPanel as HTMLDialogElement;
      if (dialog.open) {
        this.hideSettings();
      } else {
        this.showSettings();
      }
    }
  }

  private showSettings(): void {
    if (this.settingsPanel) {
      const dialog = this.settingsPanel as HTMLDialogElement;
      dialog.showModal();
      this.settingsButton?.classList.add("active");

      // Focus the active profile or first profile option
      const activeOption = dialog.querySelector(
        ".profile-option.active",
      ) as HTMLElement;
      if (activeOption) {
        activeOption.focus();
      } else {
        const firstOption = dialog.querySelector(
          ".profile-option",
        ) as HTMLElement;
        firstOption?.focus();
      }

      // Add animation class after a small delay
      setTimeout(() => {
        dialog.classList.add("active");
      }, 10);
    }
  }

  private hideSettings(returnFocusToEditor: boolean = false): void {
    if (this.settingsPanel) {
      const dialog = this.settingsPanel as HTMLDialogElement;
      dialog.classList.remove("active");
      this.settingsButton?.classList.remove("active");
      // Wait for animation before closing
      setTimeout(() => {
        if (dialog.open) {
          dialog.close();
          // Return focus to editor if requested
          if (returnFocusToEditor) {
            const editor = document.querySelector(
              ".ProseMirror",
            ) as HTMLElement;
            if (editor) {
              editor.focus();
            }
          }
        }
      }, 200);
    }
  }

  private selectProfile(profile: string): void {
    // Update UI and ARIA attributes
    const options = this.settingsPanel?.querySelectorAll(".profile-option");
    options?.forEach((option) => {
      const opt = option as HTMLElement;
      if (opt.getAttribute("data-profile") === profile) {
        opt.classList.add("active");
        opt.setAttribute("aria-checked", "true");
        opt.setAttribute("tabindex", "0");
      } else {
        opt.classList.remove("active");
        opt.setAttribute("aria-checked", "false");
        opt.setAttribute("tabindex", "-1");
      }
    });

    // Update current profile
    const oldProfile = this.currentProfile;
    this.currentProfile = profile;

    // Save to localStorage
    localStorage.setItem("selectedProfile", profile);

    // Trigger callback
    if (this.onProfileChange) {
      this.onProfileChange(profile);
    }

    // Show notification
    this.showProfileChangeNotification(oldProfile, profile);

    // Close the dialog after selection and return focus to editor
    this.hideSettings(true);
  }

  private showProfileChangeNotification(
    oldProfile: string,
    newProfile: string,
  ): void {
    const toast = document.createElement("div");
    toast.className = "toast-item profile-change-toast";
    toast.innerHTML = `
      <span>Switched from ${oldProfile.charAt(0).toUpperCase() + oldProfile.slice(1)} to ${newProfile.charAt(0).toUpperCase() + newProfile.slice(1)}</span>
    `;

    const container = document.getElementById("toast-container");
    if (container) {
      container.appendChild(toast);
      setTimeout(() => toast.classList.add("show"), 10);
      setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
      }, 2000);
    }
  }

  public setOnProfileChange(callback: (profile: string) => void): void {
    this.onProfileChange = callback;
  }

  public getCurrentProfile(): string {
    return this.currentProfile;
  }
}
