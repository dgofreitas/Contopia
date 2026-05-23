{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "Master",
  "provider": {
    "openrouter": {
      "options": {
        "timeout": 36000000,
        "setCacheKey": true
      }
    },
    "opencode": {
      "options": {
        "timeout": 36000000,
        "setCacheKey": true
      }
    },
    "zai-coding-plan": {
      "options": {
        "timeout": 36000000,
        "setCacheKey": true
      }
    }
  },
  "agent": {
    "general": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "Master": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 1800000
      }
    },
    "Architect": {
      "model": "zai-coding-plan/glm-5.1",
      "options": {
        "timeout": 600000
      }
    },
    "BackendDeveloper": {
      "model": "zai-coding-plan/glm-5.1",
      "options": {
        "timeout": 600000
      }
    },
    "BuildAgent": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "BugFixerNodejs": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "CodeAnalyzer": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "CodeReviewer": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "ContextOrganizer": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "ContextScout": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "DevopsSpecialist": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "DocWriter": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "ExternalScout": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "FrontendDeveloper": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "FrontendDeveloperAngular": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "FrontendDeveloperReact": {
      "model": "zai-coding-plan/glm-5.1",
      "options": {
        "timeout": 600000
      }
    },
    "FrontendDeveloperVue": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "ImplReviewerNodejs": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "MergeRequestCreator": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "ProductManager": {
      "model": "zai-coding-plan/glm-5.1",
      "options": {
        "timeout": 600000
      }
    },
    "QAAnalyst": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "ShellDeveloper": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "TaskManager": {
      "model": "zai-coding-plan/glm-4.5-air",
      "options": {
        "timeout": 600000
      }
    },
    "TechLead": {
      "model": "zai-coding-plan/glm-5.1",
      "options": {
        "timeout": 1800000
      }
    },
    "TestEngineer": {
      "model": "zai-coding-plan/glm-4.7",
      "options": {
        "timeout": 600000
      }
    },
    "UXDesigner": {
      "model": "zai-coding-plan/glm-5.1",
      "options": {
        "timeout": 600000
      }
    }
  },
  "permission": {
    "external_directory": {
      "/tmp/**": "allow"
    },
    "bash": {
      "*": "allow",
      "rm *": "ask",
      "rm -rf *": "deny",
      "rmdir *": "ask",
      "dd *": "deny",
      "mkfs *": "deny",
      "kill *": "deny",
      "pkill *": "deny",
      "killall *": "deny",
      "sudo *": "deny",
      "su *": "deny"
    },
    "edit": "allow",
    "write": "allow",
    "skill": "allow"
  }
}