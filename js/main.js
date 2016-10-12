window.addEventListener('load', function(){
    HeyComeBack({
        hello: "oh hi!",
        goodbye: "i miss you ❤",
        goodbyeSeconds: 10
    });
});

cheat = null;

// todo: prototype the Chao and Items for perf later on
function Chao(options) {
  var context = options.context;
  
  var self = this;
  var sequence = 1;
  
  this.health = 65;
  this.speed = 45;
  this.mood = options.mood;
  this.moodIntensity = 1.0;
  this.desire = {id: sequence, target: null, isAppeased: function(){return true;}};
  
  this.sprite = context.add.sprite(
    context.world.centerX,
    context.world.centerY,
    'pet',
    'chao_006'
  );
  this.sprite.anchor.setTo(.5);
  
  this.sprite.animations.add(
    'walkDown', 
    Phaser.Animation.generateFrameNames('chao_', 0, 1, '', 3),
    this.speed * .14,
    true,
    false
  );
  this.sprite.animations.add(
    'walkRight', 
    Phaser.Animation.generateFrameNames('chao_', 2, 3, '', 3),
    this.speed * .14,
    true,
    false
  );
  this.sprite.animations.add(
    'walkUp', 
    Phaser.Animation.generateFrameNames('chao_', 4, 5, '', 3),
    this.speed * .14,
    true,
    false
  );
  this.sprite.animations.add(
    'happy', 
    Phaser.Animation.generateFrameNames('chao_', 20, 22, '', 3),
    3,
    true,
    false
  );
  this.sprite.animations.add(
    'grumpy', 
    Phaser.Animation.generateFrameNames('chao_', 7, 9, '', 3),
    3,
    true,
    false
  );
  this.sprite.animations.play(this.mood);
  
  // prototypal
  this.update = function(){
    
    self.health -= 4;
    
    // should i look for food?
    if(self.health < 50 && (!self.tween || !self.tween.isRunning))
      self.hunt();
    
    // obsessive chasing of aquired target.
    if(self.tween && self.tween.isRunning){
      if(Phaser.Math.distance(
        self.tween.properties.x, 
        self.tween.properties.y, 
        self.desire.target.sprite.position.x,
        self.desire.target.sprite.position.y
        ) > 7){
          self.want(self.desire);
        }
    }

    // has something changed?
    if(self.desire.id != sequence){
      sequence = self.desire.id;
      console.log("desire changed!");
      
      if(self.desire.target){
        self.move({
          isImmediate: true,
          position: self.desire.target.getPosition(),
          time: (W.distance(self, self.desire.target) / self.speed) * 1000,
          callback: self.desire.target.use &&
            self.desire.target.use.bind(self) || null
        });
      }
    }
    
    // temp: then idle. let me know something
    if(self.desire.isAppeased())
      console.log(self.health);
  };
  
  this.animate = function(){
    
    if(W.isMoving(this)){
      
      var facing = W.getFacingDirection(this);
      switch(facing){
        case 'Up': this.sprite.animations.play("walkUp"); break;
        case 'Down': this.sprite.animations.play("walkDown"); break;
        case 'Left': this.sprite.animations.play("walkRight"); this.sprite.scale.x = -1; break;
        case 'Right': this.sprite.animations.play("walkRight"); this.sprite.scale.x = 1; break;
      }
    }else{
      this.sprite.animations.play(this.mood);
    }
  };
  
  this.want = function(newDesire){
    var oldVersion = self.desire.id;
    self.desire = newDesire;
    newDesire.id = oldVersion+1;
    newDesire.isAppeased = newDesire.appeaseCondition;
  };
  
  this.move = function(options){
    if(self.tween)
      self.tween.stop();
      
    // todo: potentially reuse the tween object insted of instantiating again 
    if(!self.tween || options.isImmediate)
      self.tween = context.add.tween(self.sprite);
    
    self.tween.to(
        options.position,
        options.time,
        options.mode || Phaser.Easing.Linear.None,
        true
    );
    
    if(options.callback)
      self.tween.onComplete.add(options.callback);
  };
  // prototypal
  
  this.hunt = function(){
    
    var lunch = context.findNearest('IConsumable', 'isConsumable', self);
    
    if(lunch)
      self.want({target: lunch, appeaseCondition: function(){
        return self.health > 50;
      }});
    
  };
  
  return this;
}

// todo: remove default effect. accept options with overidding effect
function Item(name, x, y){
  var self = this;
  this.name = name;
  this.effect = function(target){
    if(target.health)
      target.health += 30;
  };
  
  this.use = function() {
    // todo: only use if the this.position is close enough to use. otherwise ignore
    if(W.distance(this, self) <= 5){
      self.sprite.visible = false;
      self.effect(this);
      return true;
    }else{
      this.mood = 'grumpy';
      return false;
    }
  };
  
  this.sprite = game.add.sprite(x, y, 'pet', name);
  this.sprite.anchor.setTo(.5);
  this.sprite.inputEnabled = true;
  this.sprite.input.enableDrag();
  
  this.isConsumable = function(){
    return self.sprite.visible;
  };
  
  this.getPosition = function(){
    return {x: self.sprite.position.x, y: self.sprite.position.y};
  };
  
  return this;
}

var GameState = {

  init: function() {
    cheat = this;
    this.game.renderer.renderSession.roundPixels = true;
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    this.scale.pageAlignHorizontally = true;
    this.scale.pageAlignVertically = true;
  },

  preload: function() {
    this.game.load.atlasJSONHash('pet', 'assets/images/pet.png', 'assets/data/pet.json');
  },

  create: function() {
    var self = this;
    
    this.background = this.game.add.sprite(0, 0, 'pet', 'garden');
  
    this.pet = new Chao({
      context: this,
      mood: 'happy'
    });
  
    this.IConsumables = [
      new Item('orange', 20, 25),
      new Item('apple', 85, 15),
      new Item('blueberry', 11, 100),
      new Item('plum', 125, 148),
    ];
  
    this.trumpet = new Item('trumpet', 160, 60);

    this.duck = this.game.add.sprite(55, 136, 'pet', 'duck');
    this.duck.anchor.setTo(.5);
    this.duck.inputEnabled = true;
    
    // note: contains array of IUpdateable
    this.updateables = {
      everyFrame: [],
      timedFrame: [],
      add: function(obj, delay){
        
        if(obj.update) {
          
          if(delay || obj.frequency)
            this.timedFrame.push({
              name: obj.name,
              type: 'todo',
              loop: self.game.time.events.loop(delay || obj.frequency, obj.update)
            });
          else
            this.everyFrame.push(obj);
     
        }else{
          console.warn("Tried to add a game object that does NOT honor IUpdateable! name of object: "+obj.name);
        }
      },
      frequency: 60,
      update: function(){
        this.everyFrame.forEach(function(u){
          u.update();
        });
      }
    };
    
    this.updateables.add(this.pet, Phaser.Timer.SECOND * 1);
  },
  
  update: function(){
    this.updateables.update();
    this.pet.animate();
  },
  
  //generic version
  findNearest: function(IInterface, isValidFunc, ISprite){
    return this[IInterface+'s'].sort(function(a, b){
      if(W.distance(a, ISprite) > W.distance(b, ISprite))
        return 1;
      else
        return -1;
      
    }).find(function(i){
      return i[isValidFunc]();
    }) 
    || null;
  }
};

var game = new Phaser.Game(176, 160, Phaser.AUTO);

game.state.add('GameState', GameState);
game.state.start('GameState');