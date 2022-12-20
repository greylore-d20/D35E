export var PatreonIntegrationFactory = (function(){
    class PatreonIntegration {
        constructor() {

        }

        isPatreonActive() {
            return false;
        }
    }
    var instance;
    return {
        getInstance: function(){
            if (instance == null) {
                instance = new PatreonIntegration();
                // Hide the constructor so the returned object can't be new'd...
                instance.constructor = null;
            }
            return instance;
        }
    };
})();
